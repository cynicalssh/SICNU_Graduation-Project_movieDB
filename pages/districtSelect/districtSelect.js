var app = getApp()

Page({
  data: {
    currentCity: '',
    currentDistrict: '',
    districtList: []
  },

  onLoad: function(options) {
    var that = this
    console.log('districtSelect onLoad, options:', options)
    var city = options.city ? decodeURIComponent(options.city) : ''
    var currentDistrict = options.district ? decodeURIComponent(options.district) : '全城'
    
    console.log('解析后的城市:', city, '区域:', currentDistrict)
    
    // 获取当前城市
    if (!city) {
      if (app.globalData.userLocation && app.globalData.userLocation.city) {
        city = app.globalData.userLocation.city
        console.log('从 globalData 获取城市:', city)
      } else {
        wx.getStorage({
          key: 'userLocation',
          success: function(res) {
            if (res.data && res.data.city) {
              city = res.data.city
              console.log('从 storage 获取城市:', city)
            }
          },
          complete: function() {
            that.loadDistricts(city, currentDistrict)
          }
        })
        return
      }
    }
    
    that.loadDistricts(city, currentDistrict)
  },

  // 加载区域列表
  loadDistricts: function(city, currentDistrict) {
    var that = this
    console.log('loadDistricts 被调用，城市:', city)
    var districts = that.getDistrictsByCity(city)
    console.log('获取到的区域列表:', districts)
    
    that.setData({
      currentCity: city,
      currentDistrict: currentDistrict,
      districtList: districts
    })
  },

  // 根据城市获取区域列表
  getDistrictsByCity: function(city) {
    console.log('getDistrictsByCity 被调用，城市参数:', city, '类型:', typeof city)
    
    // 清理城市名称：去除前后空格，去除"市"、"县"、"区"等后缀
    if (city) {
      city = city.trim()
      // 如果以"市"结尾，去掉"市"
      if (city.endsWith('市')) {
        city = city.slice(0, -1)
      }
      // 如果以"县"结尾，去掉"县"
      if (city.endsWith('县')) {
        city = city.slice(0, -1)
      }
      // 如果以"区"结尾，去掉"区"
      if (city.endsWith('区')) {
        city = city.slice(0, -1)
      }
    }
    console.log('清理后的城市名称:', city)
    
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
      console.log('找到匹配的城市，返回区域列表:', districtMap[city])
      return districtMap[city]
    }
    
    // 尝试其他可能的城市名称格式
    var possibleNames = []
    if (city) {
      // 原始名称
      possibleNames.push(city)
      // 加上"市"
      if (!city.endsWith('市')) {
        possibleNames.push(city + '市')
      }
      // 去掉"市"（如果之前没去掉）
      if (city.endsWith('市')) {
        possibleNames.push(city.slice(0, -1))
      }
    }
    
    console.log('尝试匹配的城市名称列表:', possibleNames)
    for (var i = 0; i < possibleNames.length; i++) {
      if (districtMap[possibleNames[i]]) {
        console.log('通过备用名称找到匹配:', possibleNames[i], '返回区域列表:', districtMap[possibleNames[i]])
        return districtMap[possibleNames[i]]
      }
    }
    
    // 默认返回通用区域列表（当城市不在映射中时）
    console.warn('未找到匹配的城市，返回默认区域列表。城市名称:', city, '可用的城市列表:', Object.keys(districtMap))
    return ['全城', '市中心', '近郊', '远郊']
  },

  // 选择区域
  selectDistrict: function(e) {
    var district = e.currentTarget.dataset.district
    if (!district) {
      return
    }
    
    var pages = getCurrentPages()
    var prevPage = pages[pages.length - 2]  // 获取上一个页面
    
    // 更新上一个页面的区域选择
    if (prevPage && prevPage.setData) {
      prevPage.setData({
        currentDistrict: district
      })
      // 如果上一个页面有 loadCinemaList 方法，调用它
      if (prevPage.loadCinemaList) {
        prevPage.loadCinemaList()
      }
    }
    
    // 显示成功提示
    wx.showToast({
      title: '已选择' + district,
      icon: 'success',
      duration: 1500
    })
    
    // 延迟返回，让用户看到提示
    setTimeout(function() {
      wx.navigateBack()
    }, 1500)
  }
})

