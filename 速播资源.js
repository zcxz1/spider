// @name TV-速播资源
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
// 速播资源API地址
const SITE_API = process.env.SITE_API || "https://subocaiji.com/api.php/provide/vod/";

// 弹幕 API 地址
const DANMU_API = process.env.DANMU_API || "";

// ==================== 配置区域结束 ====================

/**
 * 发送 HTTP 请求到采集站
 * @param {Object} params - 查询参数对象
 * @returns {Promise<Object>} API 响应数据
 */
async function requestSiteAPI(params = {}) {
  if (!SITE_API) {
    throw new Error("请配置采集站 API 地址（SITE_API 环境变量）");
  }

  // 构建 URL
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

/**
 * 安全转换为整数
 * @param {*} value - 要转换的值
 * @returns {number} 整数
 */
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

/**
 * 格式化视频数据
 * @param {Array} list - 原始视频列表
 * @returns {Array} 格式化后的视频列表
 */
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

      // 处理多线路播放源：如果包含 $$$ 分割符，将每个线路名称与 vod_id 用 - 连接
      // 例如：vod_play_from = "rym3u8$$$ruyi", vod_id = "68368"
      // 结果：vod_play_from = "rym3u8-68368$$$ruyi-68368"
      if (vodPlayFrom && vodId && vodPlayFrom.includes("$$$")) {
        const lines = vodPlayFrom.split("$$$");
        const processedLines = lines
          .map((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // 如果线路名称已经包含 - 和数字（可能是之前处理过的），先提取原始线路名
              // 否则直接拼接
              return `${trimmedLine}-${vodId}`;
            }
            return trimmedLine;
          })
          .filter((line) => line); // 过滤空字符串
        vodPlayFrom = processedLines.join("$$$");
      } else if (vodPlayFrom && vodId) {
        // 单线路，也添加 -vod_id
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

/**
 * 将旧格式的播放源转换为新格式（vod_play_sources）
 * @param {string} vodPlayFrom - 旧格式的播放源名称（用 $$$ 分隔）
 * @param {string} vodPlayUrl - 旧格式的播放URL（用 $$$ 分隔不同线路，用 # 分隔同一线路的不同集数，用 $ 分隔集数名称和地址）
 * @param {string} vodId - 视频ID（用于处理线路名称中的 -vodId 后缀）
 * @returns {Array} 新格式的播放源列表
 */
function convertToPlaySources(vodPlayFrom, vodPlayUrl, vodId) {
  const playSources = [];
  if (!vodPlayFrom || !vodPlayUrl) {
    return playSources;
  }

  // 分割不同线路
  const sourceNames = vodPlayFrom.split("$$$");
  const urlsGroup = vodPlayUrl.split("$$$");

  sourceNames.forEach((name, idx) => {
    const groupUrl = urlsGroup[idx];
    if (!groupUrl) return;
    const episodes = groupUrl.split("#").map(ep => {
      const [n, u] = ep.split("$");
      return { name: n || "第1集", url: u };
    });
    const realName = name.replace(`-${vodId}`, "");
    playSources.push({ name: realName, episodes });
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
  return (data.class || []).map(item => ({
    type_id: String(item.type_id),
    type_name: String(item.type_name)
  }));
}

// 分类列表分页
async function categoryList(typeId, page = 1) {
  const data = await requestSiteAPI({ ac: "videolist", t: typeId, pg: page });
  return {
    list: formatVideos(data.list || []),
    page: toInt(data.page),
    pagecount: toInt(data.pagecount),
    total: toInt(data.total)
  };
}

// 关键词搜索
async function search(keyword, page = 1) {
  const data = await requestSiteAPI({ ac: "list", wd: keyword, pg: page });
  return {
    list: formatVideos(data.list || []),
    page: toInt(data.page),
    pagecount: toInt(data.pagecount),
    total: toInt(data.total)
  };
}

// 详情播放解析
async function detail(vodId) {
  const data = await requestSiteAPI({ ac: "detail", ids: vodId });
  const info = data.list?.[0];
  if (!info) throw new Error("未获取影片详情");
  const playSources = convertToPlaySources(info.vod_play_from, info.vod_play_url, info.vod_id);
  return {
    vod_id: info.vod_id,
    vod_name: info.vod_name,
    vod_pic: info.vod_pic,
    vod_content: info.vod_content || "",
    vod_year: info.vod_year,
    vod_remarks: info.vod_remarks,
    vod_douban_score: info.vod_douban_score,
    play_sources: playSources,
    danmu_api: DANMU_API
  };
}

// 固定导出五方法，OmniBox底层识别
module.exports = {
  home,
  category,
  categoryList,
  search,
  detail
};
