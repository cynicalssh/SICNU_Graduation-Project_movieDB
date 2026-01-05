/**
 * TMDB电影类型映射
 * 将中文类型名称映射到TMDB的类型ID
 * 注意：这个映射需要根据TMDB的实际类型列表来更新
 */

// TMDB类型ID映射（中文 -> ID）
// 这些ID是TMDB的标准类型ID，可以通过 /genre/movie/list API获取
var genreMap = {
  '动作': 28,
  '冒险': 12,
  '动画': 16,
  '喜剧': 35,
  '犯罪': 80,
  '纪录片': 99,
  '剧情': 18,
  '家庭': 10751,
  '奇幻': 14,
  '历史': 36,
  '恐怖': 27,
  '音乐': 10402,
  '悬疑': 9648,
  '爱情': 10749,
  '科幻': 878,
  '电视电影': 10770,
  '惊悚': 53,
  '战争': 10752,
  '西部': 37
}

/**
 * 根据中文类型名称获取TMDB类型ID
 */
function getGenreId(chineseName) {
  return genreMap[chineseName] || null
}

/**
 * 根据TMDB类型ID获取中文名称
 */
function getGenreName(genreId) {
  for (var key in genreMap) {
    if (genreMap[key] === genreId) {
      return key
    }
  }
  return null
}

module.exports = {
  genreMap: genreMap,
  getGenreId: getGenreId,
  getGenreName: getGenreName
}

