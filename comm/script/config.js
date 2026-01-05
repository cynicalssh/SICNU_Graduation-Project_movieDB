/*
备注
city: 城市（在程序载入时获取一次）
count: 返回结果数量
baiduAK: 百度地图AK
apiList: api列表
hotKeyword: 搜索页热门关键词关键词
hotTag: 搜索页热门类型
bannerList: 首页（热映页）轮播图列表列表
skinList: “我的”页面背景列表
*/
// 静态资源地址
var staticUrl = 'https://static.sesine.com/wechat-weapp-movie'

// ========== TMDB API 配置 ==========
// TMDB API基础地址
var tmdbApiUrl = 'https://api.themoviedb.org/3'
// 请在这里填入你的TMDB API Key
var tmdbApiKey = 'ea9d76ccb9ae9639d229cfda8cda1bec'  // 请替换为你的实际API Key

// TMDB API端点配置
var tmdbApiList = {
    popular: tmdbApiUrl + '/movie/now_playing',
    coming: tmdbApiUrl + '/movie/upcoming',
    top: tmdbApiUrl + '/movie/top_rated',
    search: {
        byKeyword: tmdbApiUrl + '/search/movie',
        byTag: tmdbApiUrl + '/discover/movie'  // TMDB使用discover进行类型搜索
    },
    filmDetail: tmdbApiUrl + '/movie/',
    personDetail: tmdbApiUrl + '/person/',
    genreList: tmdbApiUrl + '/genre/movie/list'  // 获取类型列表
}

module.exports = {
    city: '',
    count: 20,
    baiduAK: 'Y1R5guY8Y2GNRdDpLz7SUeM3QgADAXec',
    tmdbApiKey: tmdbApiKey,
    apiList: {
        popular: tmdbApiList.popular,
        coming: tmdbApiList.coming,
        top: tmdbApiList.top,
        search: {
            byKeyword: tmdbApiList.search.byKeyword,
            byTag: tmdbApiList.search.byTag
        },
        filmDetail: tmdbApiList.filmDetail,
        personDetail: tmdbApiList.personDetail,
        genreList: tmdbApiList.genreList,
        baiduMap: 'https://api.map.baidu.com/geocoder/v2/'
    },
    hotKeyword: ['功夫熊猫', '烈日灼心', '摆渡人', '长城', '我不是潘金莲', '这个杀手不太冷', '驴得水', '海贼王之黄金城', '西游伏妖片', '我在故宫修文物', '你的名字'],
    hotTag: ['动作', '喜剧', '爱情', '悬疑'],
    bannerList: [
        {type:'film', id: '26683290', imgUrl: staticUrl + '/images/banner_1.jpg'},
        {type:'film', id: '25793398', imgUrl: staticUrl + '/images/banner_2.jpg'},
        {type:'film', id: '26630781', imgUrl: staticUrl + '/images/banner_3.jpg'},
        {type:'film', id: '26415200', imgUrl: staticUrl + '/images/banner_4.jpg'},
        {type:'film', id: '3025375', imgUrl: staticUrl + '/images/banner_5.jpg'}
    ],
    skinList: [
        // 使用CSS渐变背景替代不可用的静态资源
        {title: '公路', imgUrl: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'},
        {title: '黑夜森林', imgUrl: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'},
        {title: '鱼与水', imgUrl: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)'},
        {title: '山之剪影', imgUrl: 'linear-gradient(135deg, #434343 0%, #000000 100%)'},
        {title: '火山', imgUrl: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'},
        {title: '科技', imgUrl: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'},
        {title: '沙漠', imgUrl: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'},
        {title: '叶子', imgUrl: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'},
        {title: '早餐', imgUrl: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'},
        {title: '英伦骑车', imgUrl: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'},
        {title: '草原', imgUrl: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)'},
        {title: '城市', imgUrl: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'}//
    ],
}
 