/**
 * TMDB数据格式转换为豆瓣格式的适配器
 * 这样就不需要修改所有页面和组件的代码
 */

// TMDB图片基础URL
var TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
var TMDB_IMAGE_BASE_LARGE = 'https://image.tmdb.org/t/p/w780'
var TMDB_IMAGE_BACKDROP = 'https://image.tmdb.org/t/p/w1280'  // 用于轮播图的大图

/**
 * 转换电影列表项（从TMDB格式转为豆瓣格式）
 */
function convertFilmItem(tmdbFilm) {
  // 轮播图优先使用backdrop，没有则使用poster
  var backdropUrl = tmdbFilm.backdrop_path ? (TMDB_IMAGE_BASE_LARGE.replace('w780', 'w1280') + tmdbFilm.backdrop_path) : ''
  var posterUrl = tmdbFilm.poster_path ? (TMDB_IMAGE_BASE_LARGE + tmdbFilm.poster_path) : ''
  
  // 处理演员信息（列表API可能不包含，需要从详情API获取）
  var casts = []
  if (tmdbFilm.credits && tmdbFilm.credits.cast) {
    casts = tmdbFilm.credits.cast.slice(0, 5).map(function(person) {
      return {
        id: person.id,
        name: person.name,
        avatars: {
          large: person.profile_path ? (TMDB_IMAGE_BASE_LARGE + person.profile_path) : '',
          medium: person.profile_path ? (TMDB_IMAGE_BASE + person.profile_path) : '',
          small: person.profile_path ? (TMDB_IMAGE_BASE + person.profile_path) : ''
        }
      }
    })
  }
  
  // 处理片长（TMDB返回的是分钟数）
  var runtime = tmdbFilm.runtime || 0
  var durations = runtime > 0 ? runtime + '分钟' : ''
  
  // 处理地区（TMDB返回的是production_countries数组）
  var countries = []
  if (tmdbFilm.production_countries && tmdbFilm.production_countries.length > 0) {
    countries = tmdbFilm.production_countries.map(function(country) {
      // TMDB返回的是ISO国家代码，需要转换为中文名称
      // 这里先直接返回英文名称，如果需要可以添加映射表
      return country.name || country.iso_3166_1 || ''
    }).filter(function(name) {
      return name !== ''
    })
  }
  
  // 生成精选短评（从overview中提取或生成，限制在12字以内）
  var shortReview = ''
  if (tmdbFilm.overview) {
    // 从简介中提取前12个字符作为短评
    var overview = tmdbFilm.overview.trim()
    // 去掉标点符号和换行，取前12字
    overview = overview.replace(/[，。！？；：、\n\r]/g, '')
    if (overview.length > 12) {
      shortReview = overview.substring(0, 12)
    } else if (overview.length > 0) {
      shortReview = overview
    }
  }
  
  // 如果没有overview或overview为空，不生成短评（显示为空）
  
  return {
    id: tmdbFilm.id,
    title: tmdbFilm.title || tmdbFilm.name || '',
    images: {
      large: posterUrl,
      medium: tmdbFilm.poster_path ? (TMDB_IMAGE_BASE + tmdbFilm.poster_path) : '',
      small: tmdbFilm.poster_path ? (TMDB_IMAGE_BASE + tmdbFilm.poster_path) : '',
      backdrop: backdropUrl || posterUrl  // 用于轮播图
    },
    rating: {
      average: tmdbFilm.vote_average ? parseFloat((tmdbFilm.vote_average / 2).toFixed(1)) : 0,
      stars: tmdbFilm.vote_average ? Math.round(tmdbFilm.vote_average / 2) : 0,
      min: 0,
      max: 5
    },
    genres: tmdbFilm.genre_names || (tmdbFilm.genres ? tmdbFilm.genres.map(function(g) { return g.name }) : []),
    year: tmdbFilm.release_date ? tmdbFilm.release_date.split('-')[0] : (tmdbFilm.first_air_date ? tmdbFilm.first_air_date.split('-')[0] : ''),
    release_date: tmdbFilm.release_date || tmdbFilm.first_air_date || '',
    casts: casts,
    runtime: runtime, // 片长（分钟数）
    durations: durations, // 片长（格式化字符串）
    countries: countries, // 地区数组
    short_review: shortReview, // 精选短评（≤12字）
    collect_count: tmdbFilm.popularity ? Math.round(tmdbFilm.popularity) : 0,
    wish_count: 0, // TMDB没有这个字段
    ratings_count: tmdbFilm.vote_count || 0
  }
}

/**
 * 转换电影详情（从TMDB格式转为豆瓣格式）
 */
function convertFilmDetail(tmdbFilm) {
  var directors = []
  var casts = []
  
  // 处理导演和演员信息
  if (tmdbFilm.credits) {
    // 导演
    if (tmdbFilm.credits.crew) {
      directors = tmdbFilm.credits.crew
        .filter(function(person) {
          return person.job === 'Director'
        })
        .map(function(person) {
          return {
            id: person.id,
            name: person.name,
            avatars: {
              large: person.profile_path ? (TMDB_IMAGE_BASE_LARGE + person.profile_path) : '',
              medium: person.profile_path ? (TMDB_IMAGE_BASE + person.profile_path) : '',
              small: person.profile_path ? (TMDB_IMAGE_BASE + person.profile_path) : ''
            }
          }
        })
    }
    
    // 演员（取前10个）
    if (tmdbFilm.credits.cast) {
      casts = tmdbFilm.credits.cast.slice(0, 10).map(function(person) {
        return {
          id: person.id,
          name: person.name,
          avatars: {
            large: person.profile_path ? (TMDB_IMAGE_BASE_LARGE + person.profile_path) : '',
            medium: person.profile_path ? (TMDB_IMAGE_BASE + person.profile_path) : '',
            small: person.profile_path ? (TMDB_IMAGE_BASE + person.profile_path) : ''
          }
        }
      })
    }
  }
  
  // 如果没有导演，尝试从crew中找
  if (directors.length === 0 && tmdbFilm.credits && tmdbFilm.credits.crew) {
    var firstDirector = tmdbFilm.credits.crew.find(function(person) {
      return person.department === 'Directing'
    })
    if (firstDirector) {
      directors = [{
        id: firstDirector.id,
        name: firstDirector.name,
        avatars: {
          large: firstDirector.profile_path ? (TMDB_IMAGE_BASE_LARGE + firstDirector.profile_path) : '',
          medium: firstDirector.profile_path ? (TMDB_IMAGE_BASE + firstDirector.profile_path) : '',
          small: firstDirector.profile_path ? (TMDB_IMAGE_BASE + firstDirector.profile_path) : ''
        }
      }]
    }
  }
  
  // 如果没有导演，设置一个默认值
  if (directors.length === 0) {
    directors = [{
      id: 0,
      name: '未知',
      avatars: {
        large: '',
        medium: '',
        small: ''
      }
    }]
  }
  
  // 处理片长（TMDB返回的是分钟数）
  var runtime = tmdbFilm.runtime || 0
  var durations = runtime > 0 ? runtime + '分钟' : ''
  
  // 处理地区（TMDB返回的是production_countries数组）
  var countries = []
  if (tmdbFilm.production_countries && tmdbFilm.production_countries.length > 0) {
    countries = tmdbFilm.production_countries.map(function(country) {
      return country.name || country.iso_3166_1 || ''
    }).filter(function(name) {
      return name !== ''
    })
  }
  
  return {
    id: tmdbFilm.id,
    title: tmdbFilm.title || tmdbFilm.name || '',
    original_title: tmdbFilm.original_title || tmdbFilm.original_name || tmdbFilm.title || tmdbFilm.name || '', // 英文标题
    images: {
      large: tmdbFilm.poster_path ? (TMDB_IMAGE_BASE_LARGE + tmdbFilm.poster_path) : '',
      medium: tmdbFilm.poster_path ? (TMDB_IMAGE_BASE + tmdbFilm.poster_path) : '',
      small: tmdbFilm.poster_path ? (TMDB_IMAGE_BASE + tmdbFilm.poster_path) : ''
    },
    rating: {
      average: tmdbFilm.vote_average ? (tmdbFilm.vote_average / 2).toFixed(1) : 0,
      stars: tmdbFilm.vote_average ? Math.round(tmdbFilm.vote_average / 2) : 0,
      min: 0,
      max: 5
    },
    genres: tmdbFilm.genres ? tmdbFilm.genres.map(function(g) { return g.name }) : [],
    year: tmdbFilm.release_date ? tmdbFilm.release_date.split('-')[0] : (tmdbFilm.first_air_date ? tmdbFilm.first_air_date.split('-')[0] : ''),
    summary: tmdbFilm.overview || '暂无简介',
    directors: directors,
    casts: casts,
    runtime: runtime, // 片长（分钟数）
    durations: durations, // 片长（格式化字符串）
    countries: countries, // 地区数组
    collect_count: tmdbFilm.popularity ? Math.round(tmdbFilm.popularity) : 0,
    wish_count: 0,
    ratings_count: tmdbFilm.vote_count || 0
  }
}

/**
 * 转换人物详情（从TMDB格式转为豆瓣格式）
 */
function convertPersonDetail(tmdbPerson) {
  return {
    id: tmdbPerson.id,
    name: tmdbPerson.name || '',
    avatars: {
      large: tmdbPerson.profile_path ? (TMDB_IMAGE_BASE_LARGE + tmdbPerson.profile_path) : '',
      medium: tmdbPerson.profile_path ? (TMDB_IMAGE_BASE + tmdbPerson.profile_path) : '',
      small: tmdbPerson.profile_path ? (TMDB_IMAGE_BASE + tmdbPerson.profile_path) : ''
    },
    birthday: tmdbPerson.birthday || '',
    born_place: tmdbPerson.place_of_birth || '',
    summary: tmdbPerson.biography || '暂无简介',
    // TMDB的人物作品信息在另外的API中，这里先返回基本信息
    works: []
  }
}

/**
 * 转换电影列表响应（从TMDB格式转为豆瓣格式）
 */
function convertFilmListResponse(tmdbResponse) {
  return {
    subjects: (tmdbResponse.results || []).map(convertFilmItem),
    total: tmdbResponse.total_results || 0,
    start: ((tmdbResponse.page || 1) - 1) * (tmdbResponse.results ? tmdbResponse.results.length : 0),
    count: tmdbResponse.results ? tmdbResponse.results.length : 0
  }
}

/**
 * 转换评论数据（从TMDB格式转为内部格式）
 */
function convertReview(tmdbReview) {
  return {
    id: tmdbReview.id || '',
    author: tmdbReview.author || '匿名用户',
    content: tmdbReview.content || '',
    created_at: tmdbReview.created_at || '',
    rating: tmdbReview.author_details && tmdbReview.author_details.rating ? (tmdbReview.author_details.rating / 2).toFixed(1) : null, // TMDB评分是0-10，转换为0-5
    avatar: tmdbReview.author_details && tmdbReview.author_details.avatar_path ? 
      (tmdbReview.author_details.avatar_path.startsWith('http') ? 
        tmdbReview.author_details.avatar_path : 
        'https://image.tmdb.org/t/p/w500' + tmdbReview.author_details.avatar_path) : ''
  }
}

/**
 * 转换评论列表响应（从TMDB格式转为内部格式）
 */
function convertReviewListResponse(tmdbResponse) {
  return {
    reviews: (tmdbResponse.results || []).map(convertReview),
    total: tmdbResponse.total_results || 0,
    page: tmdbResponse.page || 1,
    total_pages: tmdbResponse.total_pages || 1
  }
}

/**
 * 转换Reddit讨论响应（从Reddit格式转为内部格式）
 */
function convertRedditDiscussionResponse(redditResponse, filmTitle) {
  var children = redditResponse.data && redditResponse.data.children || []
  console.log('转换Reddit讨论，原始数据数量:', children.length)
  
  var discussions = children.map(function(child) {
    var post = child.data || {}
    // 过滤掉selftext为空且url指向外部的帖子（这些通常是链接分享，不是讨论）
    if (!post.selftext && post.url && !post.url.includes('reddit.com')) {
      return null
    }
    
    // 确保permalink是完整的URL
    var permalink = post.permalink
    if (permalink && !permalink.startsWith('http')) {
      permalink = 'https://www.reddit.com' + permalink
    }
    
    return {
      id: post.id || '',
      name: post.title || '无标题',
      description: post.selftext || post.title || '',
      created_at: post.created ? new Date(post.created * 1000).toISOString() : new Date().toISOString(),
      updated_at: post.edited ? new Date(post.edited * 1000).toISOString() : '',
      author: post.author || '匿名用户',
      replies_count: post.num_comments || 0,
      comment_count: post.num_comments || 0,
      score: post.score || 0,
      url: post.url || '',
      permalink: permalink || ''  // 确保包含完整的permalink用于获取回复
    }
  }).filter(function(item) {
    return item !== null
  })
  
  console.log('转换后的讨论数量:', discussions.length)
  if (discussions.length > 0) {
    console.log('第一条讨论permalink:', discussions[0].permalink)
  }
  
  return {
    discussions: discussions,
    total: redditResponse.data ? redditResponse.data.dist : discussions.length,
    page: 1,
    total_pages: 1,
    after: redditResponse.data ? redditResponse.data.after : null
  }
}

module.exports = {
  convertFilmItem: convertFilmItem,
  convertFilmDetail: convertFilmDetail,
  convertPersonDetail: convertPersonDetail,
  convertFilmListResponse: convertFilmListResponse,
  convertReview: convertReview,
  convertReviewListResponse: convertReviewListResponse,
  convertRedditDiscussionResponse: convertRedditDiscussionResponse
}

