package com.movie.controller;

import com.movie.dto.WeChatLoginRequest;
import com.movie.dto.WeChatLoginResponse;
import com.movie.entity.User;
import com.movie.service.UserService;
import com.movie.service.WeChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 认证控制器
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private WeChatService weChatService;

    @Autowired
    private UserService userService;

    /**
     * 微信登录
     */
    @PostMapping("/wechat/login")
    public WeChatLoginResponse wechatLogin(@RequestBody WeChatLoginRequest request) {
        log.info("收到微信登录请求: code={}", request.getCode());

        // 1. 通过code获取openid
        String openId = weChatService.getOpenId(request.getCode());
        log.info("获取到openId: {}", openId);

        // 2. 获取或创建用户
        User user = userService.getOrCreateUser(openId);

        // 3. 返回响应
        WeChatLoginResponse response = new WeChatLoginResponse();
        response.setToken(user.getToken());
        response.setOpenId(user.getOpenId());
        response.setUserId(user.getId());

        log.info("登录成功: userId={}, openId={}, token={}", user.getId(), openId, user.getToken());
        return response;
    }
}

