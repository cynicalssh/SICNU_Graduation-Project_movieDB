Page({
  data: {
    src: '',
    frameWidth: 0,
    frameHeight: 0,
    imageStyle: '',
    sliderValue: 100,
    saving: false,
    topInset: 20,
    canvasWidth: 0,
    canvasHeight: 0
  },
  imgInfo: null,
  baseWidth: 0,
  baseHeight: 0,
  renderWidth: 0,
  renderHeight: 0,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  touchStartX: 0,
  touchStartY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
  onLoad: function(options) {
    var src = options && options.src ? decodeURIComponent(options.src) : ''
    if (!src) {
      wx.navigateBack()
      return
    }
    this.setData({
      src: src
    })
  },
  onReady: function() {
    this.initCropArea()
  },
  initCropArea: function() {
    var systemInfo = wx.getSystemInfoSync()
    var frameWidth = systemInfo.windowWidth - 52
    var frameHeight = Math.round(frameWidth * 0.62)
    var topInset = (systemInfo.statusBarHeight || 20) + 8
    this.setData({
      frameWidth: frameWidth,
      frameHeight: frameHeight,
      topInset: topInset
    })
    this.loadImageInfoAndFit()
  },
  loadImageInfoAndFit: function() {
    var that = this
    wx.getImageInfo({
      src: that.data.src,
      success: function(res) {
        that.imgInfo = res
        that.fitImageToFrame()
      },
      fail: function() {
        wx.showToast({
          title: '读取图片失败',
          icon: 'none'
        })
        setTimeout(function() {
          wx.navigateBack()
        }, 500)
      }
    })
  },
  fitImageToFrame: function() {
    if (!this.imgInfo) {
      return
    }
    var frameWidth = this.data.frameWidth
    var frameHeight = this.data.frameHeight
    var imgWidth = this.imgInfo.width
    var imgHeight = this.imgInfo.height
    var imgRatio = imgWidth / imgHeight
    var frameRatio = frameWidth / frameHeight
    if (imgRatio > frameRatio) {
      this.baseHeight = frameHeight
      this.baseWidth = this.baseHeight * imgRatio
    } else {
      this.baseWidth = frameWidth
      this.baseHeight = this.baseWidth / imgRatio
    }
    this.scale = 1
    this.offsetX = 0
    this.offsetY = 0
    this.updateRenderAndStyle()
  },
  updateRenderAndStyle: function() {
    this.renderWidth = this.baseWidth * this.scale
    this.renderHeight = this.baseHeight * this.scale
    this.clampOffset()
    var left = this.data.frameWidth / 2 + this.offsetX - this.renderWidth / 2
    var top = this.data.frameHeight / 2 + this.offsetY - this.renderHeight / 2
    this.setData({
      imageStyle: 'left:' + left + 'px;top:' + top + 'px;width:' + this.renderWidth + 'px;height:' + this.renderHeight + 'px;',
      sliderValue: Math.round(this.scale * 100)
    })
  },
  clampOffset: function() {
    var maxOffsetX = Math.max(0, (this.renderWidth - this.data.frameWidth) / 2)
    var maxOffsetY = Math.max(0, (this.renderHeight - this.data.frameHeight) / 2)
    if (this.offsetX > maxOffsetX) {
      this.offsetX = maxOffsetX
    }
    if (this.offsetX < -maxOffsetX) {
      this.offsetX = -maxOffsetX
    }
    if (this.offsetY > maxOffsetY) {
      this.offsetY = maxOffsetY
    }
    if (this.offsetY < -maxOffsetY) {
      this.offsetY = -maxOffsetY
    }
  },
  onDragStart: function(e) {
    var touch = e.touches && e.touches[0]
    if (!touch) {
      return
    }
    this.touchStartX = touch.clientX
    this.touchStartY = touch.clientY
    this.startOffsetX = this.offsetX
    this.startOffsetY = this.offsetY
  },
  onDragMove: function(e) {
    var touch = e.touches && e.touches[0]
    if (!touch) {
      return
    }
    var deltaX = touch.clientX - this.touchStartX
    var deltaY = touch.clientY - this.touchStartY
    this.offsetX = this.startOffsetX + deltaX
    this.offsetY = this.startOffsetY + deltaY
    this.updateRenderAndStyle()
  },
  onDragEnd: function() {},
  onScaleChanging: function(e) {
    this.updateScaleFromSlider(e.detail.value)
  },
  onScaleChange: function(e) {
    this.updateScaleFromSlider(e.detail.value)
  },
  updateScaleFromSlider: function(value) {
    var nextScale = Number(value) / 100
    if (!nextScale || nextScale < 1) {
      nextScale = 1
    }
    if (nextScale > 3) {
      nextScale = 3
    }
    this.scale = nextScale
    this.updateRenderAndStyle()
  },
  onCancel: function() {
    wx.navigateBack()
  },
  onConfirm: function() {
    var that = this
    if (that.data.saving || !that.imgInfo) {
      return
    }
    that.setData({
      saving: true
    })
    var imgWidth = that.imgInfo.width
    var imgHeight = that.imgInfo.height
    var scaleToOriginX = imgWidth / that.renderWidth
    var scaleToOriginY = imgHeight / that.renderHeight
    var imgLeftInFrame = that.data.frameWidth / 2 + that.offsetX - that.renderWidth / 2
    var imgTopInFrame = that.data.frameHeight / 2 + that.offsetY - that.renderHeight / 2
    var sx = -imgLeftInFrame * scaleToOriginX
    var sy = -imgTopInFrame * scaleToOriginY
    var sWidth = that.data.frameWidth * scaleToOriginX
    var sHeight = that.data.frameHeight * scaleToOriginY
    if (sx < 0) sx = 0
    if (sy < 0) sy = 0
    if (sx + sWidth > imgWidth) sx = imgWidth - sWidth
    if (sy + sHeight > imgHeight) sy = imgHeight - sHeight
    if (sx < 0) sx = 0
    if (sy < 0) sy = 0
    var outputWidth = Math.min(1080, Math.max(720, Math.round(that.data.frameWidth * 2)))
    var outputHeight = Math.round(outputWidth * that.data.frameHeight / that.data.frameWidth)
    var sxInt = Math.floor(sx)
    var syInt = Math.floor(sy)
    var sWidthInt = Math.max(1, Math.floor(sWidth))
    var sHeightInt = Math.max(1, Math.floor(sHeight))
    if (sxInt + sWidthInt > imgWidth) {
      sWidthInt = Math.max(1, imgWidth - sxInt)
    }
    if (syInt + sHeightInt > imgHeight) {
      sHeightInt = Math.max(1, imgHeight - syInt)
    }
    that.setData({
      canvasWidth: outputWidth,
      canvasHeight: outputHeight
    }, function() {
      var ctx = wx.createCanvasContext('bgCropCanvas', that)
      ctx.clearRect(0, 0, outputWidth, outputHeight)
      ctx.drawImage(that.data.src, sxInt, syInt, sWidthInt, sHeightInt, 0, 0, outputWidth, outputHeight)
      ctx.draw(false, function() {
        that.exportCroppedImage(outputWidth, outputHeight, 1)
      })
    })
  },
  exportCroppedImage: function(outputWidth, outputHeight, retry) {
    var that = this
    wx.canvasToTempFilePath({
      canvasId: 'bgCropCanvas',
      x: 0,
      y: 0,
      width: outputWidth,
      height: outputHeight,
      destWidth: outputWidth,
      destHeight: outputHeight,
      fileType: 'jpg',
      quality: 0.92,
      success: function(res) {
        var eventChannel = that.getOpenerEventChannel && that.getOpenerEventChannel()
        if (eventChannel) {
          eventChannel.emit('cropDone', {
            tempFilePath: res.tempFilePath
          })
        }
        that.setData({
          saving: false
        })
        wx.navigateBack()
      },
      fail: function() {
        if (retry > 0) {
          setTimeout(function() {
            that.exportCroppedImage(outputWidth, outputHeight, retry - 1)
          }, 80)
          return
        }
        that.setData({
          saving: false
        })
        wx.showToast({
          title: '裁剪失败，请重试',
          icon: 'none'
        })
      }
    }, that)
  },
  stopTouchScroll: function() {}
})
