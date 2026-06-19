// @name TV-如意资源
// @downloadURL https://gh-proxy.org/https://github.com/Silent1566/OmniBox-Spider/raw/refs/heads/main/模板/JavaScript/采集站模板.js
/**
 * OmniBox 采集站直接爬虫脚本
 *
 * 此脚本直接调用采集站接口获取数据，参考 OmniBox 后端实现逻辑
 * 只需要配置采集站的 API 地址即可使用
 *
 * 配置说明：
 * 1. 在 OmniBox 后台添加采集站，获取采集站的 API 地址
 * 2. 将 API 地址配置到环境变量 SITE_API 中，或直接修改下面的 SITE_API 常量
 * 3. （可选）配置弹幕 API 地址到环境变量 DANMU_API 中，或直接修改下面的 DANMU_API 常量
 *    弹幕 API 地址示例：https://danmu.example.com
 *
 * 采集站接口规范（参考 OmniBox 后端实现）：
 * - 首页：GET {API}?ac=list&pg={page}
 * - 分类：GET {API}?ac=class
 * - 分类列表：GET {API}?ac=videolist&t={typeId}&pg={page}
 * - 搜索：GET {API}?ac=list&wd={keyword}&pg={page}
 * - 详情：GET {API}?ac=detail&ids={videoId}
 *
 * 响应格式：
 * {
 *   "page": 1,
 *   "pagecount": 10,
 *   "total": 100,
 *   "list": [...],
 *   "class": [...]
 * }
 *
 * 使用方法：
 * 1. 在 OmniBox 后台创建爬虫源，选择 JavaScript 类型
 * 2. 复制此脚本内容到爬虫源编辑器
 * 3. 配置环境变量 SITE_API 为采集站的 API 地址
 * 4. 保存并测试
 */

const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
// 采集站 API 地址（优先使用环境变量，如果没有则使用默认值）
const SITE_API = process.env.SITE_API || "http://cj.rycjapi.com/api.php/provide/vod/";

// 弹幕 API 地址
const DANMU_API = process.env.DANMU_API || "";

// ==================== 配置区域结束 ====================

async function requestSiteAPI(params = {}) {
  if (!SITE_API) {
    throw new Error("请配置采集站 API 地址（SITE_API 环境变量）");
  }
  const url = new URL(SITE_API);
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      url.searchParams.append(key, params[key]);
    }
  });

  OmniBox.log("info", `请求采集站: ${url.toString()}`);

  try {
    const response = await OmniBox.request(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
    }

    const data = JSON.parse(response.body);
    return data;
  } catch (error) {
    OmniBox.log("error", `请求采集站失败: ${error.message}`);
    throw error;
  }
}

function toInt(value) {
  if (typeof value === "number") {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function formatVideos(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const vodId = String(item.vod_id || item.VodID || "");
      let vodPlayFrom = String(item.vod_play_from || item.VodPlayFrom || "");

      if (vodPlayFrom && vodId && vodPlayFrom.includes("$$$")) {
        const lines = vodPlayFrom.split("$$$");
        const processedLines = lines
          .map((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              return `${trimmedLine}-${vodId}`;
            }
            return trimmedLine;
          })
          .filter((line) => line);
        vodPlayFrom = processedLines.join("$$$");
      } else if (vodPlayFrom && vodId) {
        vodPlayFrom = `${vodPlayFrom}-${vodId}`;
      }

      return {
        vod_id: vodId,
        vod_name: String(item.vod_name || item.VodName || ""),
        vod_pic: String(item.vod_pic || item.VodPic || ""),
        type_id: String(item.type_id || item.TypeID || ""),
        type_name: String(item.type_name || item.TypeName || ""),
        vod_year: String(item.vod_year || item.VodYear || ""),
        vod_remarks: String(item.vod_remarks || item.VodRemarks || ""),
        vod_time: String(item.vod_time || item.VodTime || ""),
        vod_play_from: vodPlayFrom,
        vod_play_url: String(item.vod_play_url || item.VodPlayURL || ""),
        vod_douban_score: String(item.vod_douban_score || item.VodDoubanScore || ""),
      };
    })
    .filter((item) => item !== null && item.vod_id);
}

function convertToPlaySources(vodPlayFrom, vodPlayUrl, vodId) {
  const playSources = [];
  if (!vodPlayFrom || !vodPlayUrl) {
    return playSources;
  }

  const sourceNames = vodPlayFrom.split("$$$");
  const urlsGroup = vodPlayUrl.split("$$$");

  sourceNames.forEach((name, idx) => {
    const urlStr = urlsGroup[idx];
    if (!urlStr) return;

    const episodes = urlStr.split("#").map(ep => {
      let [n, u] = ep.split("$");
      return {
        name: n || "第1集",
        url: u
      };
    });

    const realName = name.replace(`-${vodId}`, "");
    playSources.push({
      name: realName,
      episodes
    });
  });

  return playSources;
}

// 首页接口
async function home(page = 1) {
  const data = await requestSiteAPI({ ac: "list", pg: page });
  return {
    list: formatVideos(data.list || []),
    page: toInt(data.page),
    pagecount: toInt(data.pagecount),
    total: toInt(data.total)
  };
}

// 分类接口
async function category() {
  const data = await requestSiteAPI({ ac: "class" });
  
