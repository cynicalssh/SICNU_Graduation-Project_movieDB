var config = require('../../comm/script/config')
var userDataSync = require('../../util/userDataSync')

var IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
var IMAGE_BASE_LARGE = 'https://image.tmdb.org/t/p/w780'
var DEFAULT_AVATAR = '/resource/logo.png'

function formatHistoryDate(dateObj) {
  var year = dateObj.getFullYear()
  var month = ('0' + (dateObj.getMonth() + 1)).slice(-2)
  var day = ('0' + dateObj.getDate()).slice(-2)
  return [year, month, day].join('-')
}

function formatHistoryTime(dateObj) {
  var hours = ('0' + dateObj.getHours()).slice(-2)
  var minutes = ('0' + dateObj.getMinutes()).slice(-2)
  var seconds = ('0' + dateObj.getSeconds()).slice(-2)
  return [hours, minutes, seconds].join(':')
}

Page({
  data: {
    personId: '',
    personDetail: {},
    works: [],
    photos: [],
    links: [],
    castCount: 0,
    crewCount: 0,
    isPersonFavorite: false,
    showLoading: true,
    showContent: false,
    loadError: '',
    briefExpanded: false
  },

  onLoad: function(options) {
    var personId = options && options.id ? options.id : ''
    this.setData({
      personId: personId
    })
    this.loadPersonPage()
  },

  onPullDownRefresh: function() {
    this.loadPersonPage()
  },

  retryLoad: function() {
    this.loadPersonPage()
  },

  getTmdbBaseUrl: function() {
    var personDetailUrl = config.apiList && config.apiList.personDetail ? config.apiList.personDetail : ''
    if (personDetailUrl && personDetailUrl.indexOf('/person/') !== -1) {
      return personDetailUrl.replace(/\/person\/$/, '')
    }
    return 'https://api.themoviedb.org/3'
  },

  requestTmdb: function(path, query, successCb, failCb) {
    var baseUrl = this.getTmdbBaseUrl()
    var params = query || {}
    params.api_key = config.tmdbApiKey
    if (!params.language) {
      params.language = 'zh-CN'
    }
    var parts = []
    for (var key in params) {
      if (!params.hasOwnProperty(key)) {
        continue
      }
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        continue
      }
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
    }
    var url = baseUrl + path + (parts.length ? ('?' + parts.join('&')) : '')
    wx.request({
      url: url,
      method: 'GET',
      timeout: 25000,
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          typeof successCb === 'function' && successCb(res.data)
        } else {
          typeof failCb === 'function' && failCb({
            message: '接口响应异常',
            statusCode: res.statusCode
          })
        }
      },
      fail: function(err) {
        var msg = '请求失败，请检查网络'
        if (err && err.errMsg) {
          if (err.errMsg.indexOf('not in domain list') !== -1 || err.errMsg.indexOf('域名') !== -1) {
            msg = '请在小程序后台配置合法域名 api.themoviedb.org'
          } else if (err.errMsg.indexOf('timeout') !== -1) {
            msg = '请求超时，请稍后重试'
          }
        }
        typeof failCb === 'function' && failCb({
          message: msg
        })
      }
    })
  },

  loadPersonPage: function() {
    var that = this
    var personId = that.data.personId
    if (!personId) {
      that.setData({
        showLoading: false,
        showContent: false,
        loadError: '缺少人物ID，无法加载人物信息'
      })
      wx.stopPullDownRefresh()
      return
    }

    that.setData({
      showLoading: true,
      showContent: false,
      loadError: '',
      briefExpanded: false
    })

    that.fetchPersonBundle(personId, function(bundle) {
      var normalized = that.normalizePerson(bundle)
      that.setData({
        showLoading: false,
        showContent: true,
        loadError: '',
        personDetail: normalized.personDetail,
        works: normalized.works,
        photos: normalized.photos,
        links: normalized.links,
        castCount: normalized.castCount,
        crewCount: normalized.crewCount
      })
      wx.setNavigationBarTitle({
        title: normalized.personDetail.name || '人物详情'
      })
      that.loadFavoriteState()
      that.appendPersonHistory(normalized.personDetail)
      wx.stopPullDownRefresh()
    }, function(err) {
      that.setData({
        showLoading: false,
        showContent: false,
        loadError: (err && err.message) ? err.message : '加载失败，请稍后重试'
      })
      wx.stopPullDownRefresh()
    })
  },

  fetchPersonBundle: function(personId, successCb, failCb) {
    var that = this
    var basePath = '/person/' + encodeURIComponent(personId)
    that.requestTmdb(basePath, { language: 'zh-CN' }, function(detailZhData) {
      var bundle = {
        detail: detailZhData || {},
        detailEn: {},
        credits: { cast: [], crew: [] },
        combinedCredits: { cast: [], crew: [] },
        discoverFilms: { results: [] },
        images: { profiles: [] },
        externalIds: {}
      }
      var pending = 6
      function finishOne() {
        pending -= 1
        if (pending <= 0) {
          typeof successCb === 'function' && successCb(bundle)
        }
      }

      that.requestTmdb(basePath, { language: 'en-US' }, function(data) {
        bundle.detailEn = data || {}
        finishOne()
      }, function() {
        finishOne()
      })

      that.requestTmdb(basePath + '/movie_credits', { language: 'en-US' }, function(data) {
        bundle.credits = data || { cast: [], crew: [] }
        finishOne()
      }, function() {
        finishOne()
      })

      that.requestTmdb(basePath + '/combined_credits', { language: 'en-US' }, function(data) {
        bundle.combinedCredits = data || { cast: [], crew: [] }
        finishOne()
      }, function() {
        finishOne()
      })

      that.requestTmdb('/discover/movie', {
        language: 'en-US',
        with_people: personId,
        sort_by: 'popularity.desc',
        include_adult: 'false',
        include_video: 'false',
        page: 1
      }, function(data) {
        bundle.discoverFilms = data || { results: [] }
        finishOne()
      }, function() {
        finishOne()
      })

      that.requestTmdb(basePath + '/images', { language: 'en-US' }, function(data) {
        bundle.images = data || { profiles: [] }
        finishOne()
      }, function() {
        finishOne()
      })

      that.requestTmdb(basePath + '/external_ids', { language: 'en-US' }, function(data) {
        bundle.externalIds = data || {}
        finishOne()
      }, function() {
        finishOne()
      })
    }, function(err) {
      typeof failCb === 'function' && failCb(err)
    })
  },

  normalizeText: function(text) {
    var raw = text === undefined || text === null ? '' : String(text)
    return raw.replace(/\r/g, '\n').replace(/\n+/g, '\n').replace(/[ \t]+/g, ' ').trim()
  },

  findEnglishName: function(detail) {
    var aliases = detail && Array.isArray(detail.also_known_as) ? detail.also_known_as : []
    for (var i = 0; i < aliases.length; i++) {
      if (/^[A-Za-z0-9 .,'-]+$/.test(aliases[i])) {
        return aliases[i]
      }
    }
    return ''
  },

  mapCrewJob: function(job) {
    var mapping = {
      Director: '导演',
      Writer: '编剧',
      Screenplay: '编剧',
      Producer: '制片',
      ExecutiveProducer: '执行制片',
      Creator: '主创',
      OriginalMusicComposer: '配乐'
    }
    return mapping[job] || (job || '主创')
  },

  getCreditTitle: function(item) {
    if (!item) {
      return ''
    }
    return item.title || item.original_title || item.name || item.original_name || ''
  },

  getCreditReleaseDate: function(item) {
    if (!item) {
      return ''
    }
    return item.release_date || item.first_air_date || ''
  },

  toWorkItem: function(item, roleText, rolePriority) {
    var title = this.getCreditTitle(item)
    if (!item || !item.id || !title) {
      return null
    }
    var releaseDate = this.getCreditReleaseDate(item)
    var posterUrl = ''
    if (item.poster_path) {
      posterUrl = IMAGE_BASE + item.poster_path
    } else if (item.backdrop_path) {
      posterUrl = IMAGE_BASE + item.backdrop_path
    }
    return {
      id: item.id,
      title: title,
      releaseDate: releaseDate,
      year: releaseDate ? releaseDate.slice(0, 4) : '',
      rating: item.vote_average ? (item.vote_average / 2).toFixed(1) : '--',
      roleText: roleText || '参与',
      posterUrl: posterUrl,
      popularity: item.popularity || 0,
      voteAverage: item.vote_average || 0,
      rolePriority: rolePriority || 0
    }
  },

  buildWorks: function(credits, combinedCredits) {
    var cast = credits && Array.isArray(credits.cast) ? credits.cast : []
    var crew = credits && Array.isArray(credits.crew) ? credits.crew : []
    var combinedCast = combinedCredits && Array.isArray(combinedCredits.cast) ? combinedCredits.cast : []
    var combinedCrew = combinedCredits && Array.isArray(combinedCredits.crew) ? combinedCredits.crew : []
    var merged = []
    var i = 0

    for (i = 0; i < cast.length; i++) {
      var castItem = cast[i] || {}
      var castRole = castItem.character ? ('饰 ' + castItem.character) : '演员'
      var castWork = this.toWorkItem(castItem, castRole, 3)
      if (castWork) {
        merged.push(castWork)
      }
    }

    for (i = 0; i < crew.length; i++) {
      var crewItem = crew[i] || {}
      var crewRole = this.mapCrewJob(crewItem.job)
      var crewWork = this.toWorkItem(crewItem, crewRole, 2)
      if (crewWork) {
        merged.push(crewWork)
      }
    }

    for (i = 0; i < combinedCast.length; i++) {
      var ccItem = combinedCast[i] || {}
      var ccType = ccItem.media_type || 'movie'
      if (ccType !== 'movie') {
        continue
      }
      var ccRole = ccItem.character ? ('饰 ' + ccItem.character) : '演员'
      var ccWork = this.toWorkItem(ccItem, ccRole, 3)
      if (ccWork) {
        merged.push(ccWork)
      }
    }

    for (i = 0; i < combinedCrew.length; i++) {
      var ckItem = combinedCrew[i] || {}
      var ckType = ckItem.media_type || 'movie'
      if (ckType !== 'movie') {
        continue
      }
      var ckRole = this.mapCrewJob(ckItem.job)
      var ckWork = this.toWorkItem(ckItem, ckRole, 2)
      if (ckWork) {
        merged.push(ckWork)
      }
    }

    var map = {}
    for (i = 0; i < merged.length; i++) {
      var work = merged[i]
      var key = String(work.id)
      if (!map[key]) {
        map[key] = work
        continue
      }
      var oldWork = map[key]
      var shouldReplace = false
      if ((work.rolePriority || 0) > (oldWork.rolePriority || 0)) {
        shouldReplace = true
      } else if ((work.popularity || 0) > (oldWork.popularity || 0)) {
        shouldReplace = true
      } else if ((work.voteAverage || 0) > (oldWork.voteAverage || 0)) {
        shouldReplace = true
      }
      if (shouldReplace) {
        map[key] = work
      }
    }

    var deduped = []
    for (var k in map) {
      if (map.hasOwnProperty(k)) {
        deduped.push(map[k])
      }
    }

    deduped.sort(function(a, b) {
      var popGap = (b.popularity || 0) - (a.popularity || 0)
      if (Math.abs(popGap) > 0.01) {
        return popGap
      }
      var dateA = a.releaseDate || ''
      var dateB = b.releaseDate || ''
      if (dateA > dateB) return -1
      if (dateA < dateB) return 1
      return 0
    })

    return deduped.slice(0, 48)
  },

  buildLinks: function(detail, externalIds) {
    var links = []
    var ext = externalIds || {}
    if (detail && detail.homepage) {
      links.push({ label: '博客/官网', url: detail.homepage })
    }
    var imdbId = (detail && detail.imdb_id) ? detail.imdb_id : (ext.imdb_id || '')
    if (imdbId) {
      links.push({ label: 'IMDb', url: 'https://www.imdb.com/name/' + imdbId + '/' })
    }
    if (ext.instagram_id) {
      links.push({ label: 'Instagram', url: 'https://www.instagram.com/' + ext.instagram_id + '/' })
    }
    if (ext.twitter_id) {
      links.push({ label: 'X', url: 'https://x.com/' + ext.twitter_id })
    }
    if (ext.facebook_id) {
      links.push({ label: 'Facebook', url: 'https://www.facebook.com/' + ext.facebook_id })
    }
    if (detail && detail.id) {
      links.push({ label: 'TMDB', url: 'https://www.themoviedb.org/person/' + detail.id })
    }
    return links
  },

  normalizePerson: function(bundle) {
    var detail = bundle && bundle.detail ? bundle.detail : {}
    var detailEn = bundle && bundle.detailEn ? bundle.detailEn : {}
    var credits = bundle && bundle.credits ? bundle.credits : { cast: [], crew: [] }
    var combinedCredits = bundle && bundle.combinedCredits ? bundle.combinedCredits : { cast: [], crew: [] }
    var discoverFilms = bundle && bundle.discoverFilms ? bundle.discoverFilms : { results: [] }
    var images = bundle && bundle.images ? bundle.images : { profiles: [] }
    var externalIds = bundle && bundle.externalIds ? bundle.externalIds : {}

    var chosenDetail = detail && detail.id ? detail : detailEn
    var profilePath = (detail && detail.profile_path) ? detail.profile_path : (detailEn.profile_path || '')
    var avatarLarge = profilePath ? (IMAGE_BASE_LARGE + profilePath) : DEFAULT_AVATAR
    var avatarMedium = profilePath ? (IMAGE_BASE + profilePath) : DEFAULT_AVATAR
    var englishName = this.findEnglishName(detail) || this.findEnglishName(detailEn)
    var biographyZh = this.normalizeText(detail.biography || '')
    var biographyEn = this.normalizeText(detailEn.biography || '')
    var biography = biographyZh || biographyEn || '暂无简介'
    var summaryShort = biography.length > 110 ? (biography.slice(0, 110) + '...') : biography
    var works = this.buildWorks(credits, combinedCredits)
    if (works.length === 0 && discoverFilms && Array.isArray(discoverFilms.results)) {
      for (var d = 0; d < discoverFilms.results.length; d++) {
        var discoverItem = discoverFilms.results[d] || {}
        var discoverWork = this.toWorkItem(discoverItem, '相关电影', 1)
        if (discoverWork) {
          works.push(discoverWork)
        }
      }
    }
    var popularityVal = detail.popularity || detailEn.popularity || 0

    var legacyWorks = works.slice(0, 12).map(function(item) {
      return {
        roles: [item.roleText],
        subject: {
          id: item.id,
          title: item.title,
          images: {
            large: item.posterUrl,
            medium: item.posterUrl,
            small: item.posterUrl
          }
        }
      }
    })

    var photos = []
    var seenPhotoMap = {}
    var profileImages = images && Array.isArray(images.profiles) ? images.profiles : []
    for (var i = 0; i < profileImages.length; i++) {
      var profile = profileImages[i] || {}
      if (!profile.file_path) {
        continue
      }
      var largeUrl = IMAGE_BASE_LARGE + profile.file_path
      var thumbUrl = IMAGE_BASE + profile.file_path
      if (seenPhotoMap[largeUrl]) {
        continue
      }
      seenPhotoMap[largeUrl] = true
      photos.push({
        url: largeUrl,
        thumb: thumbUrl
      })
    }
    if (photos.length === 0 && avatarLarge && avatarLarge !== DEFAULT_AVATAR) {
      photos.push({
        url: avatarLarge,
        thumb: avatarMedium
      })
      seenPhotoMap[avatarLarge] = true
    }
    if (works.length > 0 && photos.length < 12) {
      for (var p = 0; p < works.length && photos.length < 12; p++) {
        var posterUrl = works[p].posterUrl
        if (!posterUrl || seenPhotoMap[posterUrl]) {
          continue
        }
        seenPhotoMap[posterUrl] = true
        photos.push({
          url: posterUrl,
          thumb: posterUrl
        })
      }
    }

    var castCount = (
      (credits && Array.isArray(credits.cast) ? credits.cast.length : 0) +
      (combinedCredits && Array.isArray(combinedCredits.cast) ? combinedCredits.cast.length : 0)
    )
    var crewCount = (
      (credits && Array.isArray(credits.crew) ? credits.crew.length : 0) +
      (combinedCredits && Array.isArray(combinedCredits.crew) ? combinedCredits.crew.length : 0)
    )

    return {
      personDetail: {
        id: chosenDetail.id || '',
        name: chosenDetail.name || '未知人物',
        name_en: englishName,
        avatars: {
          large: avatarLarge,
          medium: avatarMedium,
          small: avatarMedium
        },
        birthday: (detail && detail.birthday) || (detailEn && detailEn.birthday) || '未知',
        born_place: (detail && detail.place_of_birth) || (detailEn && detailEn.place_of_birth) || '未知',
        known_for_department: (detail && detail.known_for_department) || (detailEn && detailEn.known_for_department) || '电影人',
        popularity_text: popularityVal ? Number(popularityVal).toFixed(1) : '--',
        summary: biography,
        summary_short: summaryShort,
        works: legacyWorks
      },
      works: works,
      photos: photos.slice(0, 12),
      links: this.buildLinks(chosenDetail, externalIds),
      castCount: castCount,
      crewCount: crewCount
    }
  },

  loadFavoriteState: function() {
    var that = this
    wx.getStorage({
      key: 'person_favorite',
      success: function(res) {
        var list = Array.isArray(res.data) ? res.data : []
        var isFavorite = false
        for (var i = 0; i < list.length; i++) {
          if (list[i] && String(list[i].id) === String(that.data.personDetail.id)) {
            isFavorite = true
            break
          }
        }
        that.setData({
          isPersonFavorite: isFavorite
        })
      },
      fail: function() {
        that.setData({
          isPersonFavorite: false
        })
      }
    })
  },

  favoritePerson: function() {
    var that = this
    wx.getStorage({
      key: 'person_favorite',
      success: function(res) {
        that.toggleFavorite(Array.isArray(res.data) ? res.data : [])
      },
      fail: function() {
        that.toggleFavorite([])
      }
    })
  },

  toggleFavorite: function(list) {
    var that = this
    var data = that.data.personDetail || {}
    var existsIndex = -1
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === String(data.id)) {
        existsIndex = i
        break
      }
    }
    var isFavorite = false
    if (existsIndex >= 0) {
      list.splice(existsIndex, 1)
      isFavorite = false
    } else {
      list.push(data)
      isFavorite = true
    }

    wx.setStorage({
      key: 'person_favorite',
      data: list,
      success: function() {
        that.setData({
          isPersonFavorite: isFavorite
        })
        userDataSync.saveUserDataToServer('personFavorite', list)
        wx.showToast({
          title: isFavorite ? '已收藏' : '已取消收藏',
          icon: 'none'
        })
      }
    })
  },

  appendPersonHistory: function(personData) {
    var now = new Date()
    var currentDate = formatHistoryDate(now)
    var currentTime = formatHistoryTime(now)

    function saveHistory(rawHistory) {
      var history = Array.isArray(rawHistory) ? rawHistory : []
      if (history.length === 0 || !history[0] || history[0].date !== currentDate) {
        history.unshift({
          date: currentDate,
          persons: []
        })
      }

      var todayPersons = Array.isArray(history[0].persons) ? history[0].persons : []
      history[0].persons = todayPersons

      for (var i = todayPersons.length - 1; i >= 0; i--) {
        if (todayPersons[i] && todayPersons[i].data && String(todayPersons[i].data.id) === String(personData.id)) {
          todayPersons.splice(i, 1)
        }
      }

      todayPersons.unshift({
        time: currentTime,
        data: personData
      })

      if (todayPersons.length > 30) {
        todayPersons.splice(30)
      }
      if (history.length > 30) {
        history.splice(30)
      }

      wx.setStorage({
        key: 'person_history',
        data: history,
        success: function() {
          var historyList = []
          for (var d = 0; d < history.length; d++) {
            var persons = history[d] && Array.isArray(history[d].persons) ? history[d].persons : []
            for (var p = 0; p < persons.length; p++) {
              if (persons[p] && persons[p].data) {
                historyList.push(persons[p].data)
              }
            }
          }
          userDataSync.saveUserDataToServer('personHistory', historyList)
        }
      })
    }

    wx.getStorage({
      key: 'person_history',
      success: function(res) {
        saveHistory(res.data)
      },
      fail: function() {
        saveHistory([])
      }
    })
  },

  toggleBrief: function() {
    this.setData({
      briefExpanded: !this.data.briefExpanded
    })
  },

  viewFilmDetail: function(e) {
    var filmId = e.currentTarget.dataset.id
    if (!filmId) {
      return
    }
    wx.navigateTo({
      url: '../filmDetail/filmDetail?id=' + filmId
    })
  },

  previewPhoto: function(e) {
    var index = Number(e.currentTarget.dataset.index || 0)
    var photos = this.data.photos || []
    var urls = photos.map(function(item) {
      return item.url
    }).filter(function(url) {
      return !!url
    })
    if (urls.length === 0) {
      return
    }
    wx.previewImage({
      current: urls[index] || urls[0],
      urls: urls
    })
  },

  copyLink: function(e) {
    var url = e.currentTarget.dataset.url
    if (!url) {
      return
    }
    wx.setClipboardData({
      data: url,
      success: function() {
        wx.showToast({
          title: '链接已复制',
          icon: 'none'
        })
      }
    })
  }
})
