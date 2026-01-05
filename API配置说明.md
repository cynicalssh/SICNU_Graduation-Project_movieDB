# 豆瓣API配置说明

## 问题说明
由于豆瓣官方API已关闭公开访问，项目中的API地址需要更新为可用的代理服务。

## 解决方案

### 方案1：使用公开的豆瓣API代理（推荐用于测试）

当前已配置的代理地址：
```
https://douban.uieee.com/v2
```

**优点：**
- 数据格式完全兼容，无需修改代码
- 可直接使用

**缺点：**
- 可能不稳定，有访问限制
- 不适合生产环境

### 方案2：自己搭建代理服务器（推荐用于毕业设计）

#### 使用 Node.js + Express 搭建代理

1. 创建代理服务器项目
2. 安装依赖：
```bash
npm install express cors axios
```

3. 创建代理服务器代码（server.js）：
```javascript
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());

// 代理豆瓣API
app.get('/v2/movie/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { city, start, count } = req.query;
    
    // 使用豆瓣移动端API（需要模拟请求头）
    const response = await axios.get(`https://frodo.douban.com/api/v2/movie/${type}`, {
      params: { city, start, count },
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'Referer': 'https://movie.douban.com/'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('代理服务器运行在 http://localhost:3000');
});
```

4. 部署到服务器（如：腾讯云、阿里云、Heroku等）
5. 修改 `config.js` 中的 `apiUrl` 为你的服务器地址

### 方案3：使用其他电影API（需要修改代码）

#### 使用 TMDB API

1. 注册账号：https://www.themoviedb.org/
2. 获取 API Key
3. 修改代码适配 TMDB 的数据格式

## 配置步骤

### 1. 修改 API 地址

打开 `comm/script/config.js`，修改第17行的 `apiUrl`：

```javascript
// 当前配置（使用公开代理）
var apiUrl = 'https://douban.uieee.com/v2'

// 如果使用自己的服务器，改为：
// var apiUrl = 'https://your-server.com'
```

### 2. 配置小程序合法域名

**重要：** 微信小程序要求所有网络请求域名必须在后台配置白名单！

1. 登录微信公众平台：https://mp.weixin.qq.com
2. 进入"开发" -> "开发管理" -> "开发设置"
3. 在"服务器域名" -> "request合法域名"中添加你的API域名
4. 例如：`https://douban.uieee.com`

**注意：**
- 本地开发时可以在微信开发者工具中勾选"不校验合法域名"
- 真机调试和正式发布必须配置合法域名

### 3. 测试API是否可用

在浏览器中测试以下URL是否能正常返回数据：

```
https://douban.uieee.com/v2/movie/in_theaters?city=北京&start=0&count=20
```

如果返回JSON格式的电影数据，说明API可用。

## 常见问题

### Q1: 一直显示"玩命加载中…"
**原因：**
- API地址不可用
- 域名未配置到小程序后台
- 网络请求被拦截

**解决方法：**
1. 检查 `config.js` 中的 `apiUrl` 是否正确
2. 在微信开发者工具中勾选"不校验合法域名"进行测试
3. 查看控制台错误信息

### Q2: 提示"网络开小差了"
**原因：**
- API服务器不可访问
- 请求超时

**解决方法：**
1. 更换其他可用的API代理地址
2. 检查网络连接
3. 查看 `fetch.js` 中的错误日志

### Q3: 数据格式错误
**原因：**
- API返回的数据格式与预期不符

**解决方法：**
1. 检查API返回的数据结构
2. 可能需要修改 `fetch.js` 中的数据解析逻辑

## 推荐的API代理服务（仅供参考）

1. **douban.uieee.com** - 当前配置的代理
2. **api.douban.com** - 豆瓣官方（已关闭）
3. **frodo.douban.com** - 豆瓣移动端（需要特殊处理）

**注意：** 这些代理服务可能随时失效，建议自己搭建代理服务器。

## 毕业设计建议

1. **自己搭建代理服务器** - 展示后端开发能力
2. **使用模拟数据** - 如果API不稳定，可以准备本地JSON数据
3. **说明API限制** - 在毕业设计文档中说明豆瓣API的限制和解决方案

