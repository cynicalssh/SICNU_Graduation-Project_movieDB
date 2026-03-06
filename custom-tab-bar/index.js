Component({
  data: {
    selected: 0,
    darkMode: false,
    isSwitching: false,
    color: "#999999",
    selectedColor: "#47a86c",
    list: [
      {
        pagePath: "pages/popular/popular",
        text: "电影"
      },
      {
        pagePath: "pages/cinema/cinema",
        text: "影院"
      },
      {
        pagePath: "pages/my/my",
        text: "我的"
      }
    ]
  },
  lifetimes: {
    attached() {
      this.syncDarkMode()
      this.setSelected()
    },
    ready() {
      // 组件准备就绪后再次设置选中状态
      this.syncDarkMode()
      this.setSelected()
    }
  },
  pageLifetimes: {
    show() {
      // 每次页面显示时都更新选中状态
      // 延迟执行确保页面已完全显示
      const that = this
      that.syncDarkMode()
      setTimeout(() => {
        that.setSelected()
      }, 50)
      // 再次延迟确保更新
      setTimeout(() => {
        that.setSelected()
      }, 200)
    }
  },
  methods: {
    syncDarkMode() {
      try {
        this.setData({
          darkMode: !!wx.getStorageSync('dark_mode_enabled')
        })
      } catch (e) {
        this.setData({
          darkMode: false
        })
      }
    },
    setSelected() {
      const pages = getCurrentPages()
      if (pages.length === 0) {
        console.log('tabBar setSelected: pages为空')
        return
      }
      
      const currentPage = pages[pages.length - 1]
      const url = currentPage.route
      console.log('tabBar setSelected: 当前页面路径:', url)
      
      const index = this.data.list.findIndex(item => {
        return item.pagePath === url
      })
      
      console.log('tabBar setSelected: 找到索引:', index, '当前selected:', this.data.selected)
      
      if (index !== -1) {
        // 强制更新，不管当前状态是什么
        this.setData({
          selected: index
        })
        console.log('tabBar setSelected: 已更新 selected =', index)
      } else {
        console.log('tabBar setSelected: 未找到匹配的页面路径')
      }
    },
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = '/' + data.path
      const index = parseInt(data.index)

      if (Number.isNaN(index) || this.data.isSwitching) {
        return
      }
      
      // 先播放胶囊滑动动画，再执行页面切换
      this.setData({
        selected: index,
        isSwitching: true
      })

      setTimeout(() => {
        wx.switchTab({
          url: url,
          success: () => {
            // 切换成功后再次确认状态
            this.setData({
              selected: index,
              isSwitching: false
            })
          },
          fail: () => {
            // 切换失败时恢复状态
            this.setData({
              isSwitching: false
            })
            this.setSelected()
          }
        })
      }, 120)
    }
  }
})
