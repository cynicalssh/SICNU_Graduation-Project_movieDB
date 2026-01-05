# TMDB API 配置说明

## 配置步骤

### 1. 获取 TMDB API Key

1. 访问 [TMDB官网](https://www.themoviedb.org/)
2. 注册/登录账号
3. 进入 [API设置页面](https://www.themoviedb.org/settings/api)
4. 申请 API Key（选择"Developer"类型）
5. 复制你的 API Key

### 2. 配置 API Key

打开 `comm/script/config.js` 文件，找到第20行：

```javascript
var tmdbApiKey = 'YOUR_TMDB_API_KEY'  // 请替换为你的实际API Key
```

将 `YOUR_TMDB_API_KEY` 替换为你从TMDB获取的实际API Key。

例如：
```javascript
var tmdbApiKey = 'abc123def456ghi789jkl012mno345pq'
```

### 3. 配置小程序合法域名

**重要：** 微信小程序要求所有网络请求域名必须在后台配置白名单！

1. 登录微信公众平台：https://mp.weixin.qq.com
2. 进入"开发" -> "开发管理" -> "开发设置"
3. 在"服务器域名" -> "request合法域名"中添加：
   ```
   https://api.themoviedb.org
   https://image.tmdb.org
   ```

**注意：**
- 本地开发时可以在微信开发者工具中勾选"不校验合法域名"
- 真机调试和正式发布必须配置合法域名

## 数据格式说明

项目已经创建了数据适配器 (`util/tmdbAdapter.js`)，会自动将TMDB的数据格式转换为豆瓣格式，所以**不需要修改页面和组件的代码**。

### 主要转换内容：

1. **图片路径**：TMDB返回相对路径，适配器会自动拼接完整URL
   - `poster_path` → `images.large`
   - `profile_path` → `avatars.medium`

2. **评分**：TMDB使用10分制，适配器会转换为5分制（除以2）
   - `vote_average` → `rating.average`

3. **类型**：TMDB返回类型对象数组，适配器提取名称
   - `genres` → `genres` (字符串数组)

4. **导演和演员**：从 `credits` 中提取
   - `credits.crew` (job=Director) → `directors`
   - `credits.cast` → `casts`

## API端点说明

### 已配置的API端点：

- **正在热映**：`/movie/now_playing`
- **即将上映**：`/movie/upcoming`
- **Top250**：`/movie/top_rated`
- **搜索（关键词）**：`/search/movie`
- **搜索（类型）**：`/discover/movie` (使用类型ID)
- **电影详情**：`/movie/{id}` (包含credits)
- **人物详情**：`/person/{id}`

## 类型搜索说明

TMDB的类型搜索需要类型ID，而不是中文名称。项目已经创建了类型映射 (`util/genreMap.js`)，支持以下类型：

- 动作 (28)
- 冒险 (12)
- 动画 (16)
- 喜剧 (35)
- 犯罪 (80)
- 纪录片 (99)
- 剧情 (18)
- 家庭 (10751)
- 奇幻 (14)
- 历史 (36)
- 恐怖 (27)
- 音乐 (10402)
- 悬疑 (9648)
- 爱情 (10749)
- 科幻 (878)
- 惊悚 (53)
- 战争 (10752)
- 西部 (37)

如果搜索的类型不在映射中，会自动降级为关键词搜索。

## 测试步骤

1. 配置好API Key后，重新编译项目
2. 在微信开发者工具中打开项目
3. 勾选"不校验合法域名"（本地开发）
4. 进入首页，应该能看到正在热映的电影列表
5. 点击电影查看详情，应该能正常显示
6. 测试搜索功能

## 常见问题

### Q1: 一直显示"玩命加载中…"
**原因：**
- API Key未配置或配置错误
- 域名未配置到小程序后台
- 网络请求被拦截

**解决方法：**
1. 检查 `config.js` 中的 `tmdbApiKey` 是否正确
2. 在微信开发者工具中勾选"不校验合法域名"进行测试
3. 查看控制台错误信息

### Q2: 提示"网络请求失败，请检查API Key配置"
**原因：**
- API Key无效或过期
- API Key权限不足

**解决方法：**
1. 检查API Key是否正确复制
2. 确认API Key状态是否正常
3. 查看TMDB API文档确认权限要求

### Q3: 图片不显示
**原因：**
- 图片域名未配置
- 图片路径错误

**解决方法：**
1. 确保在微信后台配置了 `https://image.tmdb.org`
2. 检查控制台是否有图片加载错误

### Q4: 类型搜索不工作
**原因：**
- 类型名称不在映射表中
- 类型ID映射错误

**解决方法：**
1. 检查 `util/genreMap.js` 中的类型映射
2. 如果缺少类型，可以添加映射关系
3. 或者使用关键词搜索代替

## API限制说明

TMDB API有以下限制：
- **免费版**：每分钟40个请求
- **付费版**：更高的请求限制

对于毕业设计项目，免费版通常足够使用。

## 更多信息

- [TMDB API文档](https://developers.themoviedb.org/3)
- [TMDB API认证](https://developers.themoviedb.org/3/getting-started/authentication)

