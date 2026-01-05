# 微信小程序电影推荐系统

一个基于微信小程序的电影推荐应用，类似豆瓣电影，使用TMDB API获取电影数据。

## 项目简介

这是一个毕业设计项目，实现了完整的电影推荐功能，包括：
- 正在热映、即将上映、Top250电影列表
- 电影详情、人物详情
- 搜索功能（关键词/类型）
- 收藏功能
- 浏览历史
- 个人中心

## 技术栈

- **前端框架**：微信小程序原生框架
- **数据源**：TMDB API (The Movie Database)
- **存储**：微信小程序本地存储
- **定位服务**：百度地图API

## 项目结构

```
wechat-weapp-movie-master/
├── app.js                 # 应用入口
├── app.json              # 应用配置
├── app.wxss              # 全局样式
├── pages/                # 页面目录
│   ├── popular/          # 热映页面
│   ├── coming/           # 待映页面
│   ├── top/              # 口碑页面
│   ├── search/           # 搜索页面
│   ├── filmDetail/       # 电影详情
│   ├── personDetail/     # 人物详情
│   └── my/               # 个人中心
├── component/             # 组件目录
│   ├── filmList/         # 电影列表组件
│   ├── message/          # 消息提示组件
│   └── nullTip/          # 空状态组件
├── comm/                  # 公共资源
│   ├── script/           # 公共脚本
│   │   ├── config.js     # 配置文件
│   │   └── fetch.js      # 网络请求
│   └── style/            # 公共样式
├── util/                  # 工具函数
│   ├── tmdbAdapter.js    # TMDB数据适配器
│   ├── genreMap.js       # 类型映射
│   └── util.js           # 通用工具
└── dist/                  # 静态资源
```

## 配置说明

### 1. TMDB API Key配置

1. 访问 [TMDB官网](https://www.themoviedb.org/) 注册账号
2. 获取 API Key
3. 在 `comm/script/config.js` 中配置：

```javascript
var tmdbApiKey = 'YOUR_TMDB_API_KEY'
```

### 2. 微信小程序配置

1. 在微信公众平台配置合法域名：
   - `https://api.themoviedb.org`
   - `https://image.tmdb.org`
   - `https://api.map.baidu.com`

2. 本地开发时可在开发者工具中勾选"不校验合法域名"

### 3. 百度地图API（可选）

如需使用定位功能，在 `comm/script/config.js` 中配置百度地图AK：

```javascript
baiduAK: 'YOUR_BAIDU_AK'
```

## 功能特性

- ✅ 电影列表展示（热映/待映/Top250）
- ✅ 电影详情查看
- ✅ 人物详情查看
- ✅ 搜索功能（关键词/类型）
- ✅ 收藏功能
- ✅ 浏览历史
- ✅ 个人中心
- ✅ 主题切换
- ✅ 轮播图展示

## 开发说明

### 运行项目

1. 使用微信开发者工具打开项目
2. 配置好API Key
3. 勾选"不校验合法域名"（本地开发）
4. 编译运行

### 数据格式

项目使用数据适配器将TMDB格式转换为豆瓣格式，保持原有页面代码不变。

## 注意事项

- TMDB API有请求限制（免费版每分钟40次）
- 图片需要配置合法域名才能正常显示
- 用户数据存储在本地，未实现后端同步

## 更新日志

### v1.0.0
- 集成TMDB API
- 修复热映页面加载问题
- 优化轮播图功能
- 修复用户头像显示问题
- 移除摇一摇功能

## License

MIT License

