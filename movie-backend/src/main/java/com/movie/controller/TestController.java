package com.movie.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/")
    public String root() {
        return "Spring Boot 后端服务运行正常！\n" +
               "测试接口: http://localhost:8080/api/test\n" +
               "登录接口: POST http://localhost:8080/api/auth/wechat/login";
    }

    @GetMapping("/test")
    public String test() {
        return "Spring Boot 项目启动成功！";
    }
}

