/**
 * 用户数据同步工具
 * 用于同步用户的收藏、浏览记录、想看、看过等数据到后端
 */
var config = require('../comm/script/config')
var app = getApp()

/**
 * 获取用户token
 */
function getToken() {
  return app.globalData.token || ''
}

/**
 * 保存用户数据到后端（单个数据类型）
 * @param {string} dataType - 数据类型：filmFavorite, personFavorite, filmHistory, personHistory, filmWish, filmWatched
 * @param {Array} data - 数据列表
 * @param {function} successCallback - 成功回调
 * @param {function} failCallback - 失败回调
 */
function saveUserDataToServer(dataType, data, successCallback, failCallback) {
  // 检查是否启用后端同步
  if (!config.enableBackendSync) {
    // 后端同步已禁用，静默跳过
    return
  }

  var token = getToken()
  
  if (!token) {
    // 用户未登录时静默跳过，不显示错误
    return
  }

  // 使用 try-catch 包裹请求，避免错误显示
  try {
    wx.request({
      url: config.backendApiUrl + '/user/data/save',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        token: token,
        dataType: dataType,
        data: data || []
      },
      timeout: 3000, // 缩短超时时间，快速失败
      success: function(res) {
        if (res.statusCode === 200 && res.data && res.data.success) {
          console.log('同步数据到服务器成功:', dataType)
          typeof successCallback == "function" && successCallback(res.data)
        } else {
          // 静默处理失败，不输出错误
          typeof failCallback == "function" && failCallback(res.data ? res.data.message : '同步失败')
        }
      },
      fail: function(err) {
        // 完全静默处理，不输出任何错误信息
        // 后端未启动时，数据已保存在本地，不需要同步
        typeof failCallback == "function" && failCallback(err.errMsg || '网络错误')
      }
    })
  } catch (e) {
    // 捕获任何异常，静默处理
    typeof failCallback == "function" && failCallback('请求异常')
  }
}

/**
 * 从服务器获取用户所有数据
 * @param {function} successCallback - 成功回调，参数为数据对象
 * @param {function} failCallback - 失败回调
 */
function loadUserDataFromServer(successCallback, failCallback) {
  // 检查是否启用后端同步
  if (!config.enableBackendSync) {
    // 后端同步已禁用，直接调用失败回调
    typeof failCallback == "function" && failCallback('后端同步已禁用')
    return
  }

  var token = getToken()
  
  if (!token) {
    console.warn('用户未登录，无法从服务器加载数据')
    typeof failCallback == "function" && failCallback('用户未登录')
    return
  }

  wx.request({
    url: config.backendApiUrl + '/user/data',
    method: 'GET',
    data: {
      token: token
    },
    timeout: 10000,
    success: function(res) {
      if (res.statusCode === 200 && res.data && res.data.success && res.data.data) {
        console.log('从服务器加载用户数据成功')
        typeof successCallback == "function" && successCallback(res.data.data)
      } else {
        console.warn('从服务器加载用户数据失败:', res.data)
        typeof failCallback == "function" && failCallback(res.data ? res.data.message : '加载失败')
      }
    },
    fail: function(err) {
      // 如果是连接被拒绝（后端未启动），静默失败，不显示错误
      if (err.errMsg && (err.errMsg.indexOf('fail') >= 0 || err.errMsg.indexOf('REFUSED') >= 0)) {
        console.warn('后端服务未启动，使用本地数据')
      } else {
        console.error('从服务器加载用户数据请求失败:', err)
      }
      typeof failCallback == "function" && failCallback(err.errMsg || '网络错误')
    }
  })
}

/**
 * 同步所有用户数据到服务器
 * @param {function} successCallback - 成功回调
 * @param {function} failCallback - 失败回调
 */
function syncAllUserDataToServer(successCallback, failCallback) {
  // 检查是否启用后端同步
  if (!config.enableBackendSync) {
    // 后端同步已禁用，静默跳过
    typeof failCallback == "function" && failCallback('后端同步已禁用')
    return
  }

  var token = getToken()
  
  if (!token) {
    console.warn('用户未登录，跳过同步到服务器')
    typeof failCallback == "function" && failCallback('用户未登录')
    return
  }

  // 从本地存储读取所有数据
  var userData = {}
  var dataKeys = ['film_favorite', 'person_favorite', 'film_history', 'person_history', 'film_wish', 'film_watched']
  var serverKeys = ['filmFavorite', 'personFavorite', 'filmHistory', 'personHistory', 'filmWish', 'filmWatched']
  var loadedCount = 0
  var totalCount = dataKeys.length

  dataKeys.forEach(function(localKey, index) {
    wx.getStorage({
      key: localKey,
      success: function(res) {
        var localData = res.data || []
        // 浏览记录需要转换为扁平列表
        if (localKey === 'film_history' || localKey === 'person_history') {
          var flatList = []
          localData.forEach(function(dayData) {
            if (dayData.films) {
              dayData.films.forEach(function(item) {
                if (item.data) {
                  flatList.push(item.data)
                }
              })
            } else if (dayData.persons) {
              dayData.persons.forEach(function(item) {
                if (item.data) {
                  flatList.push(item.data)
                }
              })
            }
          })
          userData[serverKeys[index]] = flatList
        } else {
          userData[serverKeys[index]] = localData
        }
        loadedCount++
        
        if (loadedCount === totalCount) {
          // 所有数据加载完成，同步到服务器
          wx.request({
            url: config.backendApiUrl + '/user/data/sync',
            method: 'POST',
            header: {
              'Content-Type': 'application/json'
            },
            data: {
              token: token,
              filmFavorite: userData.filmFavorite,
              personFavorite: userData.personFavorite,
              filmHistory: userData.filmHistory,
              personHistory: userData.personHistory,
              filmWish: userData.filmWish,
              filmWatched: userData.filmWatched
            },
            timeout: 15000,
            success: function(res) {
              if (res.statusCode === 200 && res.data && res.data.success) {
                console.log('同步所有数据到服务器成功')
                typeof successCallback == "function" && successCallback(res.data)
              } else {
                console.warn('同步所有数据到服务器失败:', res.data)
                typeof failCallback == "function" && failCallback(res.data ? res.data.message : '同步失败')
              }
            },
            fail: function(err) {
              // 如果是连接被拒绝（后端未启动），静默失败
              if (err.errMsg && (err.errMsg.indexOf('fail') >= 0 || err.errMsg.indexOf('REFUSED') >= 0)) {
                console.warn('后端服务未启动，数据仅保存在本地')
              } else {
                console.error('同步所有数据到服务器请求失败:', err)
              }
              typeof failCallback == "function" && failCallback(err.errMsg || '网络错误')
            }
          })
        }
      },
      fail: function() {
        // 如果本地没有数据，设置为空数组
        userData[serverKeys[index]] = []
        loadedCount++
        
        if (loadedCount === totalCount) {
          // 所有数据加载完成，同步到服务器
          wx.request({
            url: config.backendApiUrl + '/user/data/sync',
            method: 'POST',
            header: {
              'Content-Type': 'application/json'
            },
            data: {
              token: token,
              filmFavorite: userData.filmFavorite || [],
              personFavorite: userData.personFavorite || [],
              filmHistory: userData.filmHistory || [],
              personHistory: userData.personHistory || [],
              filmWish: userData.filmWish || [],
              filmWatched: userData.filmWatched || []
            },
            timeout: 15000,
            success: function(res) {
              if (res.statusCode === 200 && res.data && res.data.success) {
                console.log('同步所有数据到服务器成功')
                typeof successCallback == "function" && successCallback(res.data)
              } else {
                console.warn('同步所有数据到服务器失败:', res.data)
                typeof failCallback == "function" && failCallback(res.data ? res.data.message : '同步失败')
              }
            },
            fail: function(err) {
              // 如果是连接被拒绝（后端未启动），静默失败
              if (err.errMsg && (err.errMsg.indexOf('fail') >= 0 || err.errMsg.indexOf('REFUSED') >= 0)) {
                console.warn('后端服务未启动，数据仅保存在本地')
              } else {
                console.error('同步所有数据到服务器请求失败:', err)
              }
              typeof failCallback == "function" && failCallback(err.errMsg || '网络错误')
            }
          })
        }
      }
    })
  })
}

/**
 * 将扁平列表转换为按日期分组的浏览记录格式
 */
function convertHistoryToGroupedFormat(flatList) {
  if (!flatList || !Array.isArray(flatList) || flatList.length === 0) {
    return []
  }
  
  var grouped = []
  var today = new Date()
  var todayStr = formatDate(today)
  var todayItems = []
  
  // 将服务器返回的扁平列表转换为按日期分组的格式
  flatList.forEach(function(item) {
    if (item) {
      todayItems.push({
        time: getTime(),
        data: item
      })
    }
  })
  
  if (todayItems.length > 0) {
    grouped.push({
      date: todayStr,
      films: todayItems,  // 电影浏览记录
      persons: todayItems  // 人物浏览记录（根据实际类型判断）
    })
  }
  
  return grouped
}

/**
 * 格式化日期（yyyy-MM-dd）
 */
function formatDate(date) {
  var year = date.getFullYear()
  var month = (date.getMonth() + 1).toString().padStart(2, '0')
  var day = date.getDate().toString().padStart(2, '0')
  return year + '-' + month + '-' + day
}

/**
 * 获取当前时间（HH:mm:ss）
 */
function getTime() {
  var date = new Date()
  var hours = date.getHours().toString().padStart(2, '0')
  var minutes = date.getMinutes().toString().padStart(2, '0')
  var seconds = date.getSeconds().toString().padStart(2, '0')
  return hours + ':' + minutes + ':' + seconds
}

/**
 * 合并服务器数据和本地数据（服务器数据优先）
 * @param {Object} serverData - 服务器返回的数据
 */
function mergeUserDataFromServer(serverData) {
  if (!serverData) {
    return
  }

  // 映射服务器字段到本地存储key
  var dataMap = {
    'filmFavorite': 'film_favorite',
    'personFavorite': 'person_favorite',
    'filmHistory': 'film_history',
    'personHistory': 'person_history',
    'filmWish': 'film_wish',
    'filmWatched': 'film_watched'
  }

  // 合并数据（服务器数据优先，如果服务器有数据则使用服务器的，否则保留本地）
  Object.keys(dataMap).forEach(function(serverKey) {
    var localKey = dataMap[serverKey]
    var serverValue = serverData[serverKey]
    
    if (serverValue && Array.isArray(serverValue) && serverValue.length > 0) {
      // 浏览记录需要特殊处理（转换为按日期分组的格式）
      if (serverKey === 'filmHistory' || serverKey === 'personHistory') {
        var groupedData = convertHistoryToGroupedFormat(serverValue)
        if (groupedData.length > 0) {
          wx.setStorage({
            key: localKey,
            data: groupedData,
            success: function() {
              console.log('合并浏览记录到本地存储成功:', localKey)
            }
          })
        }
      } else {
        // 其他数据直接使用
        wx.setStorage({
          key: localKey,
          data: serverValue,
          success: function() {
            console.log('合并数据到本地存储成功:', localKey)
          }
        })
      }
    } else {
      // 服务器没有数据，检查本地是否有数据，如果没有则初始化为空数组
      wx.getStorage({
        key: localKey,
        fail: function() {
          wx.setStorage({
            key: localKey,
            data: []
          })
        }
      })
    }
  })
}

module.exports = {
  saveUserDataToServer: saveUserDataToServer,
  loadUserDataFromServer: loadUserDataFromServer,
  syncAllUserDataToServer: syncAllUserDataToServer,
  mergeUserDataFromServer: mergeUserDataFromServer
}

