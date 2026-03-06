package com.movie.service;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.security.MessageDigest;

/**
 * 微信服务
 */
@Service
public class WeChatService {

    private static final Logger log = LoggerFactory.getLogger(WeChatService.class);

    @Value("${wechat.appid:}")
    private String appId;

    @Value("${wechat.secret:}")
    private String secret;

    private RestTemplate restTemplate = new RestTemplate();

    /**
     * 通过code获取openid
     * 如果未配置appid/secret，则使用测试模式（根据code生成模拟openid）
     */
    public String getOpenId(String code) {
        // 测试模式：如果appid或secret为空，使用模拟openid
        if (!StringUtils.hasText(appId) || !StringUtils.hasText(secret)) {
            log.warn("未配置微信appid/secret，使用测试模式");
            return generateTestOpenId(code);
        }

        // 正式模式：调用微信接口
        String url = "https://api.weixin.qq.com/sns/jscode2session" +
                "?appid=" + appId +
                "&secret=" + secret +
                "&js_code=" + code +
                "&grant_type=authorization_code";

        try {
            String response = restTemplate.getForObject(url, String.class);
            log.info("微信接口响应: {}", response);

            JSONObject json = JSON.parseObject(response);
            
            // 检查是否有错误
            if (json.containsKey("errcode")) {
                Integer errcode = json.getInteger("errcode");
                String errmsg = json.getString("errmsg");
                log.error("微信接口错误: errcode={}, errmsg={}", errcode, errmsg);
                throw new RuntimeException("微信登录失败: " + errmsg);
            }

            String openId = json.getString("openid");
            if (openId == null || openId.isEmpty()) {
                throw new RuntimeException("获取openid失败");
            }

            return openId;
        } catch (Exception e) {
            log.error("调用微信接口失败: ", e);
            throw new RuntimeException("调用微信接口失败: " + e.getMessage());
        }
    }

    /**
     * 测试模式：根据code生成模拟openid
     */
    private String generateTestOpenId(String code) {
        try {
            // 使用code的MD5值作为模拟openid，确保相同code得到相同openid
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(("test_" + code).getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            String testOpenId = "test_" + sb.toString().substring(0, 28); // 微信openid通常是28位
            log.info("测试模式生成openid: code={}, openId={}", code, testOpenId);
            return testOpenId;
        } catch (Exception e) {
            // 如果MD5失败，使用简单的方式
            String testOpenId = "test_" + code.hashCode();
            log.info("测试模式生成openid（简单方式）: code={}, openId={}", code, testOpenId);
            return testOpenId;
        }
    }
}

