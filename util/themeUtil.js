var LIGHT_NAV_BG = '#47a86c'
var LIGHT_NAV_TEXT = '#ffffff'
var DARK_NAV_BG = '#151515'
var DARK_NAV_TEXT = '#ffffff'

function getDarkMode() {
  try {
    return !!wx.getStorageSync('dark_mode_enabled')
  } catch (e) {
    return false
  }
}

function setDarkMode(enabled) {
  try {
    wx.setStorageSync('dark_mode_enabled', !!enabled)
  } catch (e) {
    // ignore
  }
}

function applyNavigationBar(enabled) {
  wx.setNavigationBarColor({
    frontColor: enabled ? DARK_NAV_TEXT : LIGHT_NAV_TEXT,
    backgroundColor: enabled ? DARK_NAV_BG : LIGHT_NAV_BG,
    animation: {
      duration: 160,
      timingFunc: 'easeIn'
    }
  })
}

function applyPageTheme(page) {
  var enabled = getDarkMode()
  if (page && typeof page.setData === 'function') {
    page.setData({
      darkMode: enabled
    })
  }
  if (page && typeof page.getTabBar === 'function') {
    var tabBar = page.getTabBar()
    if (tabBar && typeof tabBar.setData === 'function') {
      tabBar.setData({
        darkMode: enabled
      })
    }
  }
  applyNavigationBar(enabled)
  return enabled
}

module.exports = {
  getDarkMode: getDarkMode,
  setDarkMode: setDarkMode,
  applyNavigationBar: applyNavigationBar,
  applyPageTheme: applyPageTheme
}
