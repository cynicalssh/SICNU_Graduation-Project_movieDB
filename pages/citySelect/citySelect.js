var app = getApp()

// 热门城市列表
var hotCities = ['北京', '成都', '重庆', '广州', '杭州', '上海', '深圳', '天津', '厦门']

// 完整城市列表（按字母分组）
var cityList = {
  'A': ['阿坝', '阿克苏', '阿拉善', '阿勒泰地区', '安康', '安庆', '安顺', '安阳', '鞍山'],
  'B': ['白城', '白山', '白银', '百色', '蚌埠', '包头', '宝鸡', '保山', '保定', '北海', '北京', '本溪', '毕节', '滨州', '亳州'],
  'C': ['沧州', '昌都', '昌吉', '长春', '常德', '常州', '巢湖', '朝阳', '潮州', '郴州', '成都', '承德', '池州', '赤峰', '崇左', '滁州', '楚雄', '重庆'],
  'D': ['达州', '大理', '大连', '大庆', '大同', '丹东', '德宏', '德阳', '德州', '定西', '东莞', '东营', '都匀', '鄂尔多斯'],
  'E': ['恩施', '鄂州'],
  'F': ['防城港', '佛山', '福州', '抚顺', '抚州', '阜阳', '富阳'],
  'G': ['甘南', '赣州', '固原', '广安', '广元', '广州', '贵港', '贵阳', '桂林', '果洛'],
  'H': ['哈尔滨', '哈密', '海北', '海东', '海口', '海南', '海西', '邯郸', '汉中', '杭州', '合肥', '河池', '河源', '菏泽', '贺州', '鹤壁', '鹤岗', '黑河', '衡水', '衡阳', '红河', '呼和浩特', '湖州', '葫芦岛', '怀化', '淮安', '淮北', '淮南', '黄冈', '黄南', '黄山', '黄石', '惠州'],
  'J': ['鸡西', '吉安', '吉林', '济南', '济宁', '佳木斯', '嘉兴', '嘉峪关', '江门', '焦作', '揭阳', '金昌', '金华', '锦州', '晋城', '晋中', '荆门', '荆州', '景德镇', '九江'],
  'K': ['喀什', '开封', '克拉玛依', '昆明', '昆山'],
  'L': ['拉萨', '来宾', '莱芜', '兰州', '廊坊', '乐山', '丽江', '丽水', '连云港', '凉山', '聊城', '辽阳', '辽源', '临沧', '临汾', '临夏', '临沂', '林芝', '六安', '六盘水', '龙岩', '陇南', '娄底', '泸州', '吕梁'],
  'M': ['马鞍山', '茂名', '眉山', '梅州', '绵阳', '牡丹江'],
  'N': ['南充', '南京', '南宁', '南平', '南通', '南阳', '内江', '宁波', '宁德', '怒江'],
  'P': ['盘锦', '攀枝花', '平顶山', '平凉', '萍乡', '莆田', '濮阳', '普洱'],
  'Q': ['七台河', '齐齐哈尔', '泉州', '曲靖', '衢州'],
  'R': ['日喀则', '日照'],
  'S': ['三门峡', '三明', '三亚', '山南', '商洛', '商丘', '上饶', '韶关', '邵阳', '绍兴', '深圳', '沈阳', '十堰', '石河子', '石家庄', '石嘴山', '双鸭山', '朔州', '四平', '松原', '苏州', '宿迁', '宿州', '绥化', '随州'],
  'T': ['塔城', '台州', '太原', '泰安', '泰州', '唐山', '天水', '天津', '天门', '铁岭', '通化', '通辽', '铜川', '铜陵', '铜仁', '吐鲁番'],
  'W': ['潍坊', '威海', '渭南', '温州', '乌海', '乌兰察布', '乌鲁木齐', '无锡', '芜湖', '梧州', '武汉', '武威', '武夷山'],
  'X': ['西安', '西宁', '西双版纳', '锡林郭勒', '厦门', '仙桃', '咸宁', '咸阳', '湘潭', '湘西', '襄阳', '孝感', '忻州', '新乡', '新余', '信阳', '兴安盟', '邢台', '徐州', '许昌', '宣城'],
  'Y': ['雅安', '烟台', '延安', '延边', '盐城', '扬州', '阳江', '阳泉', '伊春', '伊犁', '宜宾', '宜昌', '宜春', '益阳', '银川', '鹰潭', '营口', '永州', '榆林', '玉林', '玉溪', '岳阳', '云浮', '运城'],
  'Z': ['枣庄', '湛江', '张家界', '张家口', '张掖', '漳州', '昭通', '肇庆', '镇江', '郑州', '中山', '中卫', '舟山', '周口', '珠海', '株洲', '驻马店', '资阳', '淄博', '自贡', '遵义']
}

Page({
  data: {
    currentCity: '',
    hotCities: hotCities,
    cityGroups: [],
    letters: [],
    searchKeyword: '',
    scrollIntoView: ''
  },
  
  onLoad: function(options) {
    var that = this
    // 获取当前城市
    var currentCity = app.globalData.userLocation ? app.globalData.userLocation.city : ''
    if (!currentCity) {
      // 从缓存读取
      wx.getStorage({
        key: 'userLocation',
        success: function(res) {
          if (res.data && res.data.city) {
            currentCity = res.data.city
          }
          that.setData({
            currentCity: currentCity || '未设置'
          })
        }
      })
    } else {
      that.setData({
        currentCity: currentCity
      })
    }
    
    // 构建城市列表
    this.buildCityList()
  },
  
  // 构建城市列表
  buildCityList: function() {
    var groups = []
    var letters = []
    
    // 按字母顺序排序
    var sortedLetters = Object.keys(cityList).sort()
    
    sortedLetters.forEach(function(letter) {
      letters.push(letter)
      groups.push({
        letter: letter,
        cities: cityList[letter]
      })
    })
    
    this.setData({
      cityGroups: groups,
      letters: letters
    })
  },
  
  // 搜索输入
  onSearchInput: function(e) {
    var keyword = e.detail.value.trim()
    this.setData({
      searchKeyword: keyword
    })
    
    if (keyword === '') {
      // 清空搜索，恢复完整列表
      this.buildCityList()
    } else {
      // 搜索城市
      this.searchCities(keyword)
    }
  },
  
  // 搜索确认
  onSearchConfirm: function(e) {
    this.onSearchInput(e)
  },
  
  // 搜索城市
  searchCities: function(keyword) {
    var groups = []
    var letters = []
    
    Object.keys(cityList).sort().forEach(function(letter) {
      var cities = cityList[letter].filter(function(city) {
        return city.indexOf(keyword) !== -1
      })
      
      if (cities.length > 0) {
        letters.push(letter)
        groups.push({
          letter: letter,
          cities: cities
        })
      }
    })
    
    this.setData({
      cityGroups: groups,
      letters: letters
    })
  },
  
  // 选择城市
  selectCity: function(e) {
    var city = e.currentTarget.dataset.city
    if (!city || city === '未设置') {
      return
    }
    
    var that = this
    
    // 保存到全局数据
    var locationInfo = {
      city: city,
      updateTime: Date.now()
    }
    app.globalData.userLocation = locationInfo
    app.globalData.userInfo = app.globalData.userInfo || {}
    app.globalData.userInfo.city = city
    
    // 保存到缓存
    wx.setStorage({
      key: 'userLocation',
      data: locationInfo
    })
    
    // 更新config中的city
    var config = require('../../comm/script/config')
    config.city = city
    
    // 显示成功提示
    wx.showToast({
      title: '已切换到' + city,
      icon: 'success',
      duration: 1500
    })
    
    // 延迟返回，让用户看到提示
    setTimeout(function() {
      wx.navigateBack()
    }, 1500)
  },
  
  // 滚动到指定字母
  scrollToLetter: function(e) {
    var letter = e.currentTarget.dataset.letter
    this.setData({
      scrollIntoView: 'letter-' + letter
    })
  }
})

