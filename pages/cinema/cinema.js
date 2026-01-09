var app = getApp()
var config = require('../../comm/script/config')

Page({
  data: {
    currentCity: '',
    currentDistrict: '全城',
    cinemaList: [],
    loading: false,
    hasMore: true,
    showEmpty: false
  },

  onLoad: function() {
    var that = this
    console.log('影院页面加载')
    // 加载当前城市信息
    that.loadCurrentCity()
    // 加载影院列表
    that.loadCinemaList()
  },

  onShow: function() {
    var that = this
    // 页面显示时检查城市是否变化
    // 优先从全局数据获取，如果为空则从缓存读取
    var currentCity = ''
    var currentDistrict = '全城'
    if (app.globalData.userLocation && app.globalData.userLocation.city) {
      currentCity = app.globalData.userLocation.city
      currentDistrict = app.globalData.userLocation.district || '全城'
    } else {
      // 从缓存同步读取最新城市和区县
      try {
        var storageData = wx.getStorageSync('userLocation')
        if (storageData && storageData.city) {
          currentCity = storageData.city
          currentDistrict = storageData.district || '全城'
          // 同步更新全局数据
          app.globalData.userLocation = storageData
        }
      } catch (e) {
        console.error('读取缓存失败:', e)
      }
    }
    
    // 如果城市变化了，更新并重新加载
    if (currentCity && currentCity !== that.data.currentCity && currentCity !== '定位中' && currentCity !== '定位失败') {
      console.log('检测到城市变化:', that.data.currentCity, '->', currentCity)
      // 切换城市时，清空旧的经纬度信息，强制使用城市文本搜索
      if (app.globalData.userLocation) {
        // 保留城市信息，但清空经纬度，让系统使用城市文本搜索
        app.globalData.userLocation.city = currentCity
        delete app.globalData.userLocation.latitude
        delete app.globalData.userLocation.longitude
      }
      // 清空旧列表
      that.setData({
        currentCity: currentCity,
        currentDistrict: currentDistrict || '全城',  // 使用获取到的区县，如果没有则显示"全城"
        cinemaList: [],  // 清空旧列表
        showEmpty: false,
        loading: false
      })
      // 重新加载影院列表
      that.loadCinemaList()
    } else if (!that.data.cinemaList || that.data.cinemaList.length === 0) {
      // 如果没有数据，加载影院列表
      if (currentCity && currentCity !== that.data.currentCity) {
        that.setData({
          currentCity: currentCity,
          currentDistrict: currentDistrict || '全城'
        })
      }
      that.loadCinemaList()
    } else if (currentCity && currentCity !== that.data.currentCity) {
      // 如果城市变化了但列表不为空，也要更新城市并重新加载
      console.log('城市已变化但列表不为空，重新加载:', that.data.currentCity, '->', currentCity)
      if (app.globalData.userLocation) {
        app.globalData.userLocation.city = currentCity
        delete app.globalData.userLocation.latitude
        delete app.globalData.userLocation.longitude
      }
      that.setData({
        currentCity: currentCity,
        currentDistrict: currentDistrict || '全城',
        cinemaList: [],
        showEmpty: false,
        loading: false
      })
      that.loadCinemaList()
    } else if (currentDistrict && currentDistrict !== that.data.currentDistrict && currentDistrict !== '全城') {
      // 如果区县变化了（可能是定位后获取到区县信息），更新显示
      console.log('检测到区县信息:', currentDistrict)
      that.setData({
        currentDistrict: currentDistrict
      })
    }
  },

  // 加载当前城市
  loadCurrentCity: function() {
    var that = this
    var currentCity = ''
    var currentDistrict = '全城'
    
    // 从全局数据获取
    if (app.globalData.userLocation && app.globalData.userLocation.city) {
      currentCity = app.globalData.userLocation.city
      currentDistrict = app.globalData.userLocation.district || '全城'
    } else {
      // 从缓存读取
      wx.getStorage({
        key: 'userLocation',
        success: function(res) {
          if (res.data && res.data.city) {
            currentCity = res.data.city
            currentDistrict = res.data.district || '全城'
            app.globalData.userLocation = res.data
          }
        },
        complete: function() {
          that.setData({
            currentCity: currentCity || '定位中',
            currentDistrict: currentDistrict || '全城'
          })
          if (!currentCity) {
            // 尝试获取位置
            that.requestLocation()
          }
        }
      })
    }
    
    if (currentCity) {
      that.setData({
        currentCity: currentCity,
        currentDistrict: currentDistrict || '全城'
      })
    }
  },

  // 请求位置信息
  requestLocation: function() {
    var that = this
    app.getCity(function(city, district) {
      var locationInfo = {
        city: city || '',
        district: district || '',
        updateTime: Date.now()
      }
      app.globalData.userLocation = locationInfo
      wx.setStorage({
        key: 'userLocation',
        data: locationInfo
      })
      // 如果有区县信息，直接显示区县；否则显示"全城"
      var displayDistrict = (district && district.trim() !== '') ? district : '全城'
      that.setData({
        currentCity: city || '定位中',
        currentDistrict: displayDistrict
      })
      // 重新加载影院列表
      that.loadCinemaList()
    }, function() {
      that.setData({
        currentCity: '定位失败',
        currentDistrict: '全城'
      })
    })
  },

  // 选择城市
  selectCity: function() {
    wx.navigateTo({
      url: '/pages/citySelect/citySelect'
    })
  },

  // 选择区域
  selectDistrict: function(e) {
    var that = this
    var city = that.data.currentCity
    var currentDistrict = that.data.currentDistrict
    
    // 如果城市为空或未定位，提示用户先选择城市
    if (!city || city === '定位中' || city === '定位失败') {
      wx.showToast({
        title: '请先选择城市',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    // 跳转到区域选择页面
    wx.navigateTo({
      url: '/pages/districtSelect/districtSelect?city=' + encodeURIComponent(city) + '&district=' + encodeURIComponent(currentDistrict)
    })
  },

  // 根据城市获取区域列表
  getDistrictsByCity: function(city) {
    // 这里可以根据不同城市返回不同的区域列表
    // 实际应该从后端API获取
    var districtMap = {
      '成都': ['全城', '锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区', '青白江区', '新都区', '温江区', '双流区', '郫都区', '都江堰市', '彭州市', '邛崃市', '崇州市', '金堂县', '大邑县', '蒲江县', '新津县'],
      '北京': ['全城', '东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '昌平区', '大兴区', '房山区', '顺义区', '怀柔区', '平谷区', '密云区', '延庆区'],
      '上海': ['全城', '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区', '闵行区', '宝山区', '嘉定区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'],
      '广州': ['全城', '越秀区', '海珠区', '荔湾区', '天河区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '从化区', '增城区'],
      '深圳': ['全城', '罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区', '大鹏新区'],
      '广元': ['全城', '利州区', '昭化区', '朝天区', '旺苍县', '青川县', '剑阁县', '苍溪县'],
      '重庆': ['全城', '万州区', '涪陵区', '渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '綦江区', '大足区', '渝北区', '巴南区', '黔江区', '长寿区', '江津区', '合川区', '永川区', '南川区', '璧山区', '铜梁区', '潼南区', '荣昌区', '梁平区', '城口县', '丰都县', '垫江县', '武隆区', '忠县', '开州区', '云阳县', '奉节县', '巫山县', '巫溪县', '石柱县', '秀山县', '酉阳县', '彭水县'],
      '杭州': ['全城', '上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '富阳区', '临安区', '桐庐县', '淳安县', '建德市'],
      '南京': ['全城', '玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区', '雨花台区', '江宁区', '六合区', '溧水区', '高淳区'],
      '武汉': ['全城', '江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区', '东西湖区', '汉南区', '蔡甸区', '江夏区', '黄陂区', '新洲区'],
      '西安': ['全城', '新城区', '碑林区', '莲湖区', '灞桥区', '未央区', '雁塔区', '阎良区', '临潼区', '长安区', '高陵区', '鄠邑区', '蓝田县', '周至县'],
      '天津': ['全城', '和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区'],
      '苏州': ['全城', '虎丘区', '吴中区', '相城区', '姑苏区', '吴江区', '常熟市', '张家港市', '昆山市', '太仓市'],
      '郑州': ['全城', '中原区', '二七区', '管城回族区', '金水区', '上街区', '惠济区', '中牟县', '巩义市', '荥阳市', '新密市', '新郑市', '登封市'],
      '长沙': ['全城', '芙蓉区', '天心区', '岳麓区', '开福区', '雨花区', '望城区', '长沙县', '宁乡市', '浏阳市'],
      '济南': ['全城', '历下区', '市中区', '槐荫区', '天桥区', '历城区', '长清区', '章丘区', '济阳区', '莱芜区', '钢城区', '平阴县', '商河县'],
      '青岛': ['全城', '市南区', '市北区', '黄岛区', '崂山区', '李沧区', '城阳区', '即墨区', '胶州市', '平度市', '莱西市'],
      '大连': ['全城', '中山区', '西岗区', '沙河口区', '甘井子区', '旅顺口区', '金州区', '普兰店区', '瓦房店市', '庄河市', '长海县'],
      '沈阳': ['全城', '和平区', '沈河区', '大东区', '皇姑区', '铁西区', '苏家屯区', '浑南区', '沈北新区', '于洪区', '辽中区', '康平县', '法库县', '新民市'],
      '哈尔滨': ['全城', '道里区', '南岗区', '道外区', '平房区', '松北区', '香坊区', '呼兰区', '阿城区', '双城区', '依兰县', '方正县', '宾县', '巴彦县', '木兰县', '通河县', '延寿县', '尚志市', '五常市'],
      '昆明': ['全城', '五华区', '盘龙区', '官渡区', '西山区', '东川区', '呈贡区', '晋宁区', '富民县', '宜良县', '石林县', '嵩明县', '禄劝县', '寻甸县', '安宁市'],
      '福州': ['全城', '鼓楼区', '台江区', '仓山区', '马尾区', '晋安区', '长乐区', '闽侯县', '连江县', '罗源县', '闽清县', '永泰县', '平潭县', '福清市'],
      '厦门': ['全城', '思明区', '海沧区', '湖里区', '集美区', '同安区', '翔安区'],
      '石家庄': ['全城', '长安区', '桥西区', '新华区', '井陉矿区', '裕华区', '藁城区', '鹿泉区', '栾城区', '井陉县', '正定县', '行唐县', '灵寿县', '高邑县', '深泽县', '赞皇县', '无极县', '平山县', '元氏县', '赵县', '辛集市', '晋州市', '新乐市'],
      '太原': ['全城', '小店区', '迎泽区', '杏花岭区', '尖草坪区', '万柏林区', '晋源区', '清徐县', '阳曲县', '娄烦县', '古交市'],
      '合肥': ['全城', '瑶海区', '庐阳区', '蜀山区', '包河区', '长丰县', '肥东县', '肥西县', '庐江县', '巢湖市'],
      '南昌': ['全城', '东湖区', '西湖区', '青云谱区', '青山湖区', '新建区', '红谷滩区', '南昌县', '安义县', '进贤县'],
      '南宁': ['全城', '兴宁区', '青秀区', '江南区', '西乡塘区', '良庆区', '邕宁区', '武鸣区', '隆安县', '马山县', '上林县', '宾阳县', '横县'],
      '贵阳': ['全城', '南明区', '云岩区', '花溪区', '乌当区', '白云区', '观山湖区', '开阳县', '息烽县', '修文县', '清镇市'],
      '海口': ['全城', '秀英区', '龙华区', '琼山区', '美兰区'],
      '兰州': ['全城', '城关区', '七里河区', '西固区', '安宁区', '红古区', '永登县', '皋兰县', '榆中县'],
      '银川': ['全城', '兴庆区', '西夏区', '金凤区', '永宁县', '贺兰县', '灵武市'],
      '西宁': ['全城', '城东区', '城中区', '城西区', '城北区', '湟中区', '大通县', '湟源县'],
      '乌鲁木齐': ['全城', '天山区', '沙依巴克区', '新市区', '水磨沟区', '头屯河区', '达坂城区', '米东区', '乌鲁木齐县'],
      '拉萨': ['全城', '城关区', '堆龙德庆区', '林周县', '当雄县', '尼木县', '曲水县', '达孜县', '墨竹工卡县'],
      '呼和浩特': ['全城', '新城区', '回民区', '玉泉区', '赛罕区', '土默特左旗', '托克托县', '和林格尔县', '清水河县', '武川县']
    }
    
    // 如果城市在映射中，返回对应区域
    if (districtMap[city]) {
      return districtMap[city]
    }
    
    // 如果城市名称包含"市"，尝试去掉"市"再查找
    if (city && city.indexOf('市') !== -1) {
      var cityWithoutShi = city.replace('市', '')
      if (districtMap[cityWithoutShi]) {
        return districtMap[cityWithoutShi]
      }
    }
    
    // 如果城市名称包含"县"或"区"，尝试去掉再查找
    if (city && (city.indexOf('县') !== -1 || city.indexOf('区') !== -1)) {
      var cityWithoutSuffix = city.replace(/[市县区]$/, '')
      if (districtMap[cityWithoutSuffix]) {
        return districtMap[cityWithoutSuffix]
      }
    }
    
    // 默认返回通用区域列表（当城市不在映射中时）
    return ['全城', '市中心', '近郊', '远郊']
  },

  // 搜索
  onSearchFocus: function() {
    wx.navigateTo({
      url: '/pages/search/search?type=cinema'
    })
  },

  // 加载影院列表
  loadCinemaList: function() {
    var that = this
    that.setData({
      loading: true,
      showEmpty: false
    })

    // 检查是否有高德地图Key
    if (!config.amapKey || config.amapKey === '') {
      console.error('高德地图Key未配置')
      that.setData({
        loading: false,
        showEmpty: true
      })
      wx.showToast({
        title: '地图服务未配置',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 获取用户位置
    var latitude = null
    var longitude = null
    
    if (app.globalData.userLocation) {
      latitude = app.globalData.userLocation.latitude
      longitude = app.globalData.userLocation.longitude
    }
    
    // 如果没有位置信息
    if (!latitude || !longitude) {
      // 如果已经选择了城市，直接使用城市文本搜索
      if (that.data.currentCity && that.data.currentCity !== '定位中' && that.data.currentCity !== '定位失败') {
        console.log('没有位置信息，使用城市文本搜索:', that.data.currentCity)
        that.searchCinemasByCity(function(cinemaList) {
          that.setData({
            cinemaList: cinemaList || [],
            loading: false,
            showEmpty: !cinemaList || cinemaList.length === 0
          })
        })
      } else {
        // 如果没有城市信息，尝试获取位置
        wx.getLocation({
          type: 'gcj02',  // 高德地图使用GCJ-02坐标系
          success: function(res) {
            latitude = res.latitude
            longitude = res.longitude
            // 保存位置信息
            if (!app.globalData.userLocation) {
              app.globalData.userLocation = {}
            }
            app.globalData.userLocation.latitude = latitude
            app.globalData.userLocation.longitude = longitude
            // 搜索影院
            that.searchCinemas(latitude, longitude)
          },
          fail: function(err) {
            console.error('获取位置失败:', err)
            that.setData({
              loading: false,
              showEmpty: true
            })
            wx.showToast({
              title: '获取位置失败',
              icon: 'none',
              duration: 2000
            })
          }
        })
      }
    } else {
      // 有位置信息，直接搜索影院（周边搜索）
      that.searchCinemas(latitude, longitude)
    }
  },

  // 搜索影院（调用高德地图API）
  searchCinemas: function(latitude, longitude) {
    var that = this
    var locationParam = longitude + ',' + latitude  // 高德地图格式：经度,纬度
    
    console.log('搜索影院，位置:', locationParam, '城市:', that.data.currentCity, '区域:', that.data.currentDistrict)
    
    // 多级搜索策略：先关键词，再类型，再扩大范围，最后城市搜索
    // 第一级：使用关键词搜索（10公里）
    that.searchCinemasByType(locationParam, 1, true, function(cinemaList) {
      if (cinemaList && cinemaList.length > 0) {
        that.filterAndSetCinemaList(cinemaList)
      } else {
        // 第二级：使用类型搜索（10公里）
        console.log('关键词搜索无结果，尝试类型搜索')
        that.searchCinemasByType(locationParam, 1, false, function(cinemaList) {
          if (cinemaList && cinemaList.length > 0) {
            that.filterAndSetCinemaList(cinemaList)
          } else {
            // 第三级：扩大搜索半径（20公里，使用关键词）
            console.log('10公里范围无结果，尝试扩大搜索半径到20公里')
            that.searchCinemasByType(locationParam, 2, true, function(cinemaList) {
              if (cinemaList && cinemaList.length > 0) {
                that.filterAndSetCinemaList(cinemaList)
              } else {
                // 第四级：城市文本搜索
                console.log('周边搜索无结果，尝试城市关键词搜索')
                that.searchCinemasByCity(function(cinemaList) {
                  that.setData({
                    cinemaList: cinemaList || [],
                    loading: false,
                    showEmpty: !cinemaList || cinemaList.length === 0
                  })
                })
              }
            })
          }
        })
      }
    })
  },

  // 按类型搜索影院（周边搜索）
  searchCinemasByType: function(locationParam, radiusLevel, useKeywords, callback) {
    var that = this
    // radiusLevel 1: 10公里, 2: 20公里, 3: 50公里
    var radiusMap = {
      1: 10000,  // 10公里
      2: 20000,  // 20公里
      3: 50000   // 50公里
    }
    var radius = radiusMap[radiusLevel] || 10000
    
    // 构建请求参数
    var requestData = {
      key: config.amapKey,
      location: locationParam,
      radius: radius,
      offset: 50,
      page: 1,
      extensions: 'all'
    }
    
    // 根据参数决定使用关键词还是类型
    if (useKeywords) {
      // 只使用关键词，不限制类型（更宽松）
      requestData.keywords = '电影院|影院|影城|影剧院'
    } else {
      // 只使用类型，不限制关键词
      requestData.types = '080301'
    }
    
    wx.request({
      url: config.apiList.amapPlaceAround,
      data: requestData,
      method: 'GET',
      success: function(res) {
        console.log('高德地图周边搜索API响应 (radius=' + radius + '):', res.data)
        
        if (res.data && res.data.status === '1' && res.data.pois && res.data.pois.length > 0) {
          // 筛选出真正的电影院
          var filteredPois = res.data.pois.filter(function(poi) {
            var name = poi.name || ''
            var type = poi.type || ''
            var typecode = poi.typecode || ''
            // 检查名称是否包含影院相关关键词
            var isCinema = name.indexOf('电影') !== -1 || 
                          name.indexOf('影院') !== -1 || 
                          name.indexOf('影城') !== -1 ||
                          name.indexOf('影剧院') !== -1 ||
                          name.indexOf('剧场') !== -1
            // 检查类型代码是否为电影院
            var isCinemaType = typecode === '080301' || type.indexOf('电影院') !== -1 || type.indexOf('影剧院') !== -1
            // 排除购物中心、商场等
            var isNotMall = name.indexOf('百货') === -1 && 
                           name.indexOf('商城') === -1 && 
                           name.indexOf('购物') === -1 &&
                           name.indexOf('超市') === -1 &&
                           name.indexOf('市场') === -1
            return (isCinema || isCinemaType) && isNotMall
          })
          
          if (filteredPois.length > 0) {
            var cinemaList = that.convertPoiListToCinemaList(filteredPois)
            typeof callback == "function" && callback(cinemaList)
          } else {
            typeof callback == "function" && callback([])
          }
        } else {
          typeof callback == "function" && callback([])
        }
      },
      fail: function(err) {
        console.error('周边搜索请求失败:', err)
        typeof callback == "function" && callback([])
      }
    })
  },

  // 筛选并设置影院列表
  filterAndSetCinemaList: function(cinemaList) {
    var that = this
    // 如果选择了特定区域，进行筛选
    if (that.data.currentDistrict && that.data.currentDistrict !== '全城') {
      cinemaList = cinemaList.filter(function(cinema) {
        return cinema.adname && cinema.adname.indexOf(that.data.currentDistrict) !== -1
      })
    }
    
    that.setData({
      cinemaList: cinemaList,
      loading: false,
      showEmpty: cinemaList.length === 0
    })
  },

  // 按城市搜索影院（文本搜索）
  searchCinemasByCity: function(callback) {
    var that = this
    var city = that.data.currentCity || ''
    
    if (!city || city === '定位中' || city === '定位失败') {
      typeof callback == "function" && callback([])
      return
    }
    
    // 构建搜索关键词
    var keywords = '电影院'
    // 如果选择了特定区域，在关键词中包含区域名称
    if (that.data.currentDistrict && that.data.currentDistrict !== '全城') {
      keywords = that.data.currentDistrict + keywords
    }
    
    // 先尝试只使用关键词搜索（不限制类型）
    wx.request({
      url: 'https://restapi.amap.com/v3/place/text',  // 高德地图文本搜索API
      data: {
        key: config.amapKey,
        keywords: keywords,
        city: city,
        offset: 50,
        page: 1,
        extensions: 'all'
      },
      method: 'GET',
      success: function(res) {
        console.log('高德地图文本搜索API响应:', res.data)
        
        if (res.data && res.data.status === '1' && res.data.pois && res.data.pois.length > 0) {
          // 筛选出真正的电影院
          var filteredPois = res.data.pois.filter(function(poi) {
            var name = poi.name || ''
            var type = poi.type || ''
            var typecode = poi.typecode || ''
            // 检查名称是否包含影院相关关键词
            var isCinema = name.indexOf('电影') !== -1 || 
                          name.indexOf('影院') !== -1 || 
                          name.indexOf('影城') !== -1 ||
                          name.indexOf('影剧院') !== -1 ||
                          name.indexOf('剧场') !== -1
            // 检查类型代码是否为电影院
            var isCinemaType = typecode === '080301' || type.indexOf('电影院') !== -1 || type.indexOf('影剧院') !== -1
            // 排除购物中心、商场等
            var isNotMall = name.indexOf('百货') === -1 && 
                           name.indexOf('商城') === -1 && 
                           name.indexOf('购物') === -1 &&
                           name.indexOf('超市') === -1 &&
                           name.indexOf('市场') === -1
            return (isCinema || isCinemaType) && isNotMall
          })
          
          if (filteredPois.length > 0) {
            var cinemaList = that.convertPoiListToCinemaList(filteredPois)
            typeof callback == "function" && callback(cinemaList)
          } else {
            // 如果关键词搜索没结果，尝试只使用类型搜索
            console.log('关键词搜索无结果，尝试类型搜索')
            wx.request({
              url: 'https://restapi.amap.com/v3/place/text',
              data: {
                key: config.amapKey,
                types: '080301',
                city: city,
                offset: 50,
                page: 1,
                extensions: 'all'
              },
              method: 'GET',
              success: function(res2) {
                console.log('高德地图类型搜索API响应:', res2.data)
                if (res2.data && res2.data.status === '1' && res2.data.pois && res2.data.pois.length > 0) {
                  var filteredPois2 = res2.data.pois.filter(function(poi) {
                    var name = poi.name || ''
                    var isNotMall = name.indexOf('百货') === -1 && 
                                   name.indexOf('商城') === -1 && 
                                   name.indexOf('购物') === -1 &&
                                   name.indexOf('超市') === -1 &&
                                   name.indexOf('市场') === -1
                    return isNotMall
                  })
                  if (filteredPois2.length > 0) {
                    var cinemaList2 = that.convertPoiListToCinemaList(filteredPois2)
                    typeof callback == "function" && callback(cinemaList2)
                  } else {
                    typeof callback == "function" && callback([])
                  }
                } else {
                  typeof callback == "function" && callback([])
                }
              },
              fail: function() {
                typeof callback == "function" && callback([])
              }
            })
          }
        } else {
          typeof callback == "function" && callback([])
        }
      },
      fail: function(err) {
        console.error('文本搜索请求失败:', err)
        typeof callback == "function" && callback([])
      }
    })
  },

  // 转换POI列表为影院列表
  convertPoiListToCinemaList: function(pois) {
    var that = this
    var userLat = app.globalData.userLocation ? app.globalData.userLocation.latitude : null
    var userLng = app.globalData.userLocation ? app.globalData.userLocation.longitude : null
    
    return pois.map(function(poi) {
      // 解析距离
      var distance = 0
      var distanceText = ''
      
      if (poi.distance) {
        // 周边搜索返回的距离
        distance = parseInt(poi.distance)
      } else if (userLat && userLng && poi.location) {
        // 文本搜索需要计算距离
        var poiLocation = poi.location.split(',')
        var poiLng = parseFloat(poiLocation[0])
        var poiLat = parseFloat(poiLocation[1])
        // 简单的距离计算（Haversine公式的简化版）
        var R = 6371000 // 地球半径（米）
        var dLat = (poiLat - userLat) * Math.PI / 180
        var dLng = (poiLng - userLng) * Math.PI / 180
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(poiLat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        distance = R * c
      }
      
      if (distance > 0) {
        if (distance < 1000) {
          distanceText = distance + 'm'
        } else {
          distanceText = (distance / 1000).toFixed(1) + 'km'
        }
      }
      
      // 解析地址
      var address = poi.address || ''
      if (!address) {
        // 如果没有详细地址，拼接省市区
        var addressParts = []
        if (poi.pname) addressParts.push(poi.pname)
        if (poi.cityname) addressParts.push(poi.cityname)
        if (poi.adname) addressParts.push(poi.adname)
        if (poi.business_area) addressParts.push(poi.business_area)
        address = addressParts.join('')
      }
      
      // 解析标签（从type字段提取）
      var tags = []
      if (poi.type) {
        var typeParts = poi.type.split(';')
        typeParts.forEach(function(part) {
          if (part && part.indexOf('电影院') === -1 && part.indexOf('影城') === -1) {
            tags.push(part)
          }
        })
      }
      
      // 解析电话
      var tel = poi.tel || ''
      if (tel && tel.indexOf(';') !== -1) {
        tel = tel.split(';')[0]  // 取第一个电话
      }
      
      return {
        id: poi.id,
        name: poi.name,
        address: address,
        distance: distanceText,
        distanceValue: distance,  // 用于排序
        latitude: poi.location ? parseFloat(poi.location.split(',')[1]) : userLat,
        longitude: poi.location ? parseFloat(poi.location.split(',')[0]) : userLng,
        tel: tel,
        tags: tags.length > 0 ? tags : ['影院'],
        businessArea: poi.business_area || '',
        pname: poi.pname || '',  // 省份
        cityname: poi.cityname || '',  // 城市
        adname: poi.adname || ''  // 区县
      }
    })
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    var that = this
    that.loadCinemaList()
    setTimeout(function() {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 查看影院详情
  viewCinemaDetail: function(e) {
    var cinemaId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/cinemaDetail/cinemaDetail?id=' + cinemaId
    })
  }
})

