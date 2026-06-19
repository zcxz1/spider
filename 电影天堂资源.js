// @name TV-电影天堂资源
const OmniBox = require("omnibox_sdk");

// ==================== 配置区域 ====================
const SITE_API = process.env.SITE_API || "https://caiji.dyttzyapi.com/api.php/provide/vod/";
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
  const urlGroups = vodPlayUrl.split("$$$");
  sourceNames.forEach((name, idx) => {
    const groupUrl = urlGroups[idx];
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

async function home(page = 1) {
  const data = await requestSiteAPI({ ac: "list", pg: page });
  return {
    list: formatVideos(data.list || []),
    page: toInt(data.page),
    pagecount: toInt(data.pagecount),
    total: toInt(data.total)
  };
}

async function category() {
  const data = await requestSiteAPI({ ac: "class" });
  return (data.class || []).map(item => ({
    type_id: String(item.type_id),
    type_name: String(item.type_name)
  }));
}

async function categoryList(typeId, page = 1) {
  const data = await requestSiteAPI({ ac: "videolist", t: typeId, pg: page });
  return {
    list: formatVideos(data.list || []),
    page: toInt(data.page),
    pagecount: toInt(data.pagecount),
    total: toInt(data.total)
  };
}

async function search(keyword, page = 1) {
  const data = await requestSiteAPI({ ac: "list", wd: keyword, pg: page });
  return {
    list: formatVideos(data.list || []),
    page: toInt(data.page),
    pagecount: toInt(data.pagecount),
    total: toInt(data.total)
  };
}

async function detail(vodId) {
  const data = await requestSiteAPI({ ac: "detail", ids: vodId });
  const info = data.list?.[0];
  if (!info) throw new Error("未获取影片详情");
  const playSources = convertToPlaySources(info.vod_play_from, info.vod_play_url, info.vod_id);
  return {
    vod_id: info.vod_id,
    vod_name: info.vod_name,
