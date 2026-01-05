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
      average: tmdbFilm.vote_average ? (tmdbFilm.vote_average / 2).toFixed(1) : 0,
      stars: tmdbFilm.vote_average ? Math.round(tmdbFilm.vote_average / 2) : 0,
      min: 0,
      max: 5
    },
    genres: tmdbFilm.genre_names || (tmdbFilm.genres ? tmdbFilm.genres.map(function(g) { return g.name }) : []),
    year: tmdbFilm.release_date ? tmdbFilm.release_date.split('-')[0] : (tmdbFilm.first_air_date ? tmdbFilm.first_air_date.split('-')[0] : ''),
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
  
  return {
    id: tmdbFilm.id,
    title: tmdbFilm.title || tmdbFilm.name || '',
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

module.exports = {
  convertFilmItem: convertFilmItem,
  convertFilmDetail: convertFilmDetail,
  convertPersonDetail: convertPersonDetail,
  convertFilmListResponse: convertFilmListResponse
}

