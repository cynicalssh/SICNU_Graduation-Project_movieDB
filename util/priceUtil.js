/**
 * 票价计算工具
 * 优先从后端API获取真实票价，如果API不可用则使用基于市场数据的本地计算
 */
var config = require('../comm/script/config')

// 根据字符串生成简单的hash值（用于确保同一组合价格一致）
function hashString(str) {
  var hash = 0
  if (str.length === 0) return hash
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// 获取影院的基础价格系数（根据影院品牌和ID）
function getCinemaBasePrice(cinemaId, cinemaName, brand) {
  // 根据影院名称或ID的hash来确定基础价格系数
  var cinemaHash = hashString(cinemaId + (cinemaName || ''))
  
  // 不同品牌的基础价格范围（根据实际市场行情）
  var brandPriceRange = {
    'IMAX': { min: 55, max: 85 },      // IMAX: 55-85元
    '4DX': { min: 50, max: 80 },       // 4DX: 50-80元
    '杜比': { min: 45, max: 75 },       // 杜比: 45-75元
    '巨幕': { min: 42, max: 68 },       // 巨幕: 42-68元
    'VIP': { min: 65, max: 95 },       // VIP: 65-95元
    'default': { min: 35, max: 60 }    // 普通: 35-60元
  }
  
  var priceRange = brandPriceRange[brand] || brandPriceRange.default
  
  // 根据影院hash值生成基础价格
  var range = priceRange.max - priceRange.min
  var basePrice = priceRange.min + (cinemaHash % (range + 1))
  
  return Math.round(basePrice)
}

// 获取电影的票价系数（根据电影ID和热度）
function getFilmPriceMultiplier(filmId, filmTitle, rating) {
  // 根据电影ID的hash来确定价格系数
  var filmHash = hashString(filmId + (filmTitle || ''))
  
  // 根据评分调整价格（评分高的热门电影稍微贵一点）
  var ratingMultiplier = 1.0
  if (rating && rating > 0) {
    if (rating >= 9.0) {
      ratingMultiplier = 1.10  // 高分热门电影（如8.5分以上）
    } else if (rating >= 8.0) {
      ratingMultiplier = 1.05  // 中等偏上评分
    } else if (rating >= 7.0) {
      ratingMultiplier = 1.0   // 普通评分
    } else if (rating >= 6.0) {
      ratingMultiplier = 0.95  // 较低评分
    } else {
      ratingMultiplier = 0.90  // 低分电影
    }
  }
  
  // 根据电影hash值生成额外的价格波动（±3元，更符合实际波动）
  var filmAdjustment = (filmHash % 7) - 3 // -3到+3
  
  return {
    multiplier: ratingMultiplier,
    adjustment: filmAdjustment
  }
}

// 获取时间段的票价系数（根据实际市场定价策略）
function getTimeSlotMultiplier(timeSlot) {
  var hour = parseInt(timeSlot.split(':')[0])
  
  // 上午场（9:00-11:59）：0.75倍（早场优惠）
  if (hour >= 9 && hour < 12) {
    return 0.75
  }
  // 下午场（12:00-17:59）：1.0倍（标准价格）
  else if (hour >= 12 && hour < 18) {
    return 1.0
  }
  // 晚上场（18:00-21:59）：1.15倍（黄金时段，稍贵）
  else if (hour >= 18 && hour < 22) {
    return 1.15
  }
  // 深夜场（22:00以后）：0.9倍（深夜场优惠）
  else {
    return 0.9
  }
}

/**
 * 从后端API获取真实票价（异步）
 * @param {string} cinemaId - 影院ID
 * @param {string} cinemaName - 影院名称
 * @param {string} brand - 影院品牌（IMAX、4DX等）
 * @param {string} filmId - 电影ID
 * @param {string} filmTitle - 电影标题
 * @param {number} rating - 电影评分
 * @param {string} timeSlot - 时间段（如 "18:30"）
 * @param {function} successCallback - 成功回调函数
 * @param {function} failCallback - 失败回调函数
 */
function fetchPriceFromApi(cinemaId, cinemaName, brand, filmId, filmTitle, rating, timeSlot, successCallback, failCallback) {
  var apiUrl = config.backendApiUrl + '/price/calculate'
  
  wx.request({
    url: apiUrl,
    method: 'POST',
    header: {
      'Content-Type': 'application/json'
    },
    data: {
      cinemaId: cinemaId || '',
      cinemaName: cinemaName || '',
      brand: brand || 'default',
      filmId: filmId || '',
      filmTitle: filmTitle || '',
      rating: rating || 0,
      timeSlot: timeSlot || '14:00',
      city: config.city || '北京',
      date: getTodayDate()
    },
    timeout: 5000,  // 5秒超时
    success: function(res) {
      if (res.statusCode === 200 && res.data && res.data.price) {
        console.log('从后端API获取票价成功:', res.data)
        if (successCallback) {
          successCallback(res.data.price)
        }
      } else {
        console.warn('后端API返回数据格式错误:', res.data)
        if (failCallback) {
          failCallback()
        }
      }
    },
    fail: function(err) {
      console.warn('从后端API获取票价失败，使用本地计算:', err)
      if (failCallback) {
        failCallback()
      }
    }
  })
}

/**
 * 获取今天的日期（格式：yyyy-MM-dd）
 */
function getTodayDate() {
  var today = new Date()
  var year = today.getFullYear()
  var month = (today.getMonth() + 1).toString().padStart(2, '0')
  var day = today.getDate().toString().padStart(2, '0')
  return year + '-' + month + '-' + day
}

/**
 * 本地计算票价（基于真实市场数据，作为备选方案）
 * @param {string} cinemaId - 影院ID
 * @param {string} cinemaName - 影院名称
 * @param {string} brand - 影院品牌（IMAX、4DX等）
 * @param {string} filmId - 电影ID
 * @param {string} filmTitle - 电影标题
 * @param {number} rating - 电影评分
 * @param {string} timeSlot - 时间段（如 "18:30"）
 * @returns {number} 票价（整数）
 */
function calculatePriceLocally(cinemaId, cinemaName, brand, filmId, filmTitle, rating, timeSlot) {
  // 1. 获取影院基础价格
  var basePrice = getCinemaBasePrice(cinemaId, cinemaName, brand)
  
  // 2. 获取电影价格系数和调整值
  var filmPrice = getFilmPriceMultiplier(filmId, filmTitle, rating)
  
  // 3. 获取时间段系数
  var timeMultiplier = getTimeSlotMultiplier(timeSlot || '14:00')
  
  // 4. 计算最终价格
  var finalPrice = basePrice * filmPrice.multiplier * timeMultiplier + filmPrice.adjustment
  
  // 5. 价格取整，并确保在合理范围内（根据实际市场：普通场最低28元，VIP最高150元）
  finalPrice = Math.round(finalPrice)
  
  // 根据不同品牌设置不同的价格范围
  var minPrice = 28  // 普通场最低价
  var maxPrice = 150 // VIP场最高价
  
  // 根据品牌调整价格范围
  if (brand === 'VIP') {
    minPrice = 50
    maxPrice = 150
  } else if (brand === 'IMAX' || brand === '4DX') {
    minPrice = 35
    maxPrice = 120
  } else if (brand === '杜比' || brand === '巨幕') {
    minPrice = 32
    maxPrice = 100
  }
  
  if (finalPrice < minPrice) finalPrice = minPrice
  if (finalPrice > maxPrice) finalPrice = maxPrice
  
  return finalPrice
}

/**
 * 计算票价（同步方法，优先使用本地计算，保证性能）
 * 注意：如果需要真实票价，请使用异步方法 calculateTicketPriceAsync
 * 
 * @param {string} cinemaId - 影院ID
 * @param {string} cinemaName - 影院名称
 * @param {string} brand - 影院品牌（IMAX、4DX等）
 * @param {string} filmId - 电影ID
 * @param {string} filmTitle - 电影标题
 * @param {number} rating - 电影评分
 * @param {string} timeSlot - 时间段（如 "18:30"）
 * @returns {number} 票价（整数）
 */
function calculateTicketPrice(cinemaId, cinemaName, brand, filmId, filmTitle, rating, timeSlot) {
  // 直接使用本地计算（基于真实市场数据）
  return calculatePriceLocally(cinemaId, cinemaName, brand, filmId, filmTitle, rating, timeSlot)
}

/**
 * 异步计算票价（从后端API获取真实票价）
 * @param {string} cinemaId - 影院ID
 * @param {string} cinemaName - 影院名称
 * @param {string} brand - 影院品牌（IMAX、4DX等）
 * @param {string} filmId - 电影ID
 * @param {string} filmTitle - 电影标题
 * @param {number} rating - 电影评分
 * @param {string} timeSlot - 时间段（如 "18:30"）
 * @param {function} callback - 回调函数，参数为票价（number）
 */
function calculateTicketPriceAsync(cinemaId, cinemaName, brand, filmId, filmTitle, rating, timeSlot, callback) {
  if (!callback) {
    console.warn('异步计算票价需要提供回调函数')
    callback = function(price) {
      console.log('计算票价:', price)
    }
  }
  
  // 尝试从后端API获取真实票价
  fetchPriceFromApi(
    cinemaId, cinemaName, brand, filmId, filmTitle, rating, timeSlot,
    // 成功回调：使用API返回的真实票价
    function(apiPrice) {
      callback(apiPrice)
    },
    // 失败回调：使用本地计算（基于市场数据）
    function() {
      var localPrice = calculatePriceLocally(cinemaId, cinemaName, brand, filmId, filmTitle, rating, timeSlot)
      callback(localPrice)
    }
  )
}

/**
 * 获取影院的最低票价（用于在影院列表中显示）
 * @param {string} cinemaId - 影院ID
 * @param {string} cinemaName - 影院名称
 * @param {string} brand - 影院品牌
 * @returns {number} 最低票价
 */
function getCinemaMinPrice(cinemaId, cinemaName, brand) {
  var basePrice = getCinemaBasePrice(cinemaId, cinemaName, brand)
  // 最低票价为基础价格的0.75倍（上午场优惠）
  return Math.round(basePrice * 0.75)
}

/**
 * 异步获取影院的最低票价（从后端API获取）
 * @param {string} cinemaId - 影院ID
 * @param {string} cinemaName - 影院名称
 * @param {string} brand - 影院品牌
 * @param {function} callback - 回调函数，参数为最低票价（number）
 */
function getCinemaMinPriceAsync(cinemaId, cinemaName, brand, callback) {
  if (!callback) {
    console.warn('异步获取最低票价需要提供回调函数')
    callback = function(price) {
      console.log('最低票价:', price)
    }
  }
  
  var apiUrl = config.backendApiUrl + '/price/min'
  
  wx.request({
    url: apiUrl,
    method: 'GET',
    data: {
      cinemaId: cinemaId || '',
      cinemaName: cinemaName || '',
      brand: brand || 'default'
    },
    timeout: 5000,  // 5秒超时
    success: function(res) {
      if (res.statusCode === 200 && res.data && res.data.minPrice) {
        console.log('从后端API获取最低票价成功:', res.data)
        callback(res.data.minPrice)
      } else {
        console.warn('后端API返回数据格式错误，使用本地计算:', res.data)
        var localPrice = getCinemaMinPrice(cinemaId, cinemaName, brand)
        callback(localPrice)
      }
    },
    fail: function(err) {
      console.warn('从后端API获取最低票价失败，使用本地计算:', err)
      var localPrice = getCinemaMinPrice(cinemaId, cinemaName, brand)
      callback(localPrice)
    }
  })
}

module.exports = {
  // 同步方法（使用本地计算，基于真实市场数据）
  calculateTicketPrice: calculateTicketPrice,
  getCinemaMinPrice: getCinemaMinPrice,
  
  // 异步方法（从后端API获取真实票价）
  calculateTicketPriceAsync: calculateTicketPriceAsync,
  getCinemaMinPriceAsync: getCinemaMinPriceAsync
}

