// @name TV-如意资源
const OmniBox = require("omnibox_sdk");
const SITE_API = process.env.SITE_API || "http://cj.rycjapi.com/api.php/provide/vod/";
const DANMU_API = process.env.DANMU_API || "";

async function requestSiteAPI(params = {}) {
  if (!SITE_API) throw new Error("未配置API地址");
  const url = new URL(SITE_API);
  Object.keys(params).forEach(key => {
    if (params[key] != null && params[key] !== "") url.searchParams.append(key, params[key]);
  });
  OmniBox.log("info", `请求: ${url}`);
  try {
    const res = await OmniBox.request(url.toString(), {
      method: "GET",
      headers: {"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    });
    if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
    return JSON.parse(res.body);
  } catch (e) {
    OmniBox.log("error", e.message);
    throw e;
  }
}

function toInt(v) {
  if (typeof v === "number") return Math.floor(v);
  if (typeof v === "string") {
    let n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function formatVideos(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (!item) return null;
    const vodId = String(item.vod_id || "");
    let playFrom = String(item.vod_play_from || "");
    if (playFrom && vodId) {
      playFrom = playFrom.split("$$$").map(l => `${l}-${vodId}`).join("$$$");
    }
    return {
      vod_id: vodId,
      vod_name: String(item.vod_name || ""),
      vod_pic: String(item.vod_pic || ""),
      type_id: String(item.type_id || ""),
      type_name: String(item.type_name || ""),
      vod_year: String(item.vod_year || ""),
      vod_remarks: String(item.vod_remarks || ""),
      vod_time: String(item.vod_time || ""),
      vod_play_from: playFrom,
      vod_play_url: String(item.vod_play_url || ""),
      vod_douban_score: String(item.vod_douban_score || "")
    }
  }).filter(Boolean);
}

function convertToPlaySources(vodPlayFrom, vodPlayUrl, vodId) {
  const sources = [];
  if (!vodPlayFrom || !vodPlayUrl) return sources;
  const names = vodPlayFrom.split("$$$");
  const urlsGroup = vodPlayUrl.split("$$$");
  names.forEach((name, idx) => {
    const urlStr = urlsGroup[idx];
    if (!urlStr) return;
    const episodes = urlStr.split("#").map(ep => {
      let [n, u] = ep.split("$");
      return {name:n||"第1集", url:u};
    });
    sources.push({name: name.replace(`-${vodId}`,""), episodes});
  });
  return sources;
}

async function home(page = 1) {
  const data = await requestSiteAPI({ac:"list", pg:page});
  return {
    list: formatVideos(data.list || []),
    page: toInt(data.page),
    pagecount: toInt(data.pagecount),
    total: toInt(data.total)
  };
}

async function category() {
  const data = await requestSiteAPI({ac:"class"});
  return (data.class || []).map(item => ({
    type_id: String(item.type_id),
    type_name: String(item.type_name)
  }));
}

async function categoryList(typeId, page = 1) {
  const data = await requestSiteAPI({ac:"videolist", t:typeId, pg:page});
  return {
    list: formatVideos(data.list || []),
    page: toInt(data.page),
    pagecount: toInt(data.pagecount),
    total: toInt(data.total)
  };
}

async function search(keyword, page = 1) {
  const data = await requestSiteAPI({ac:"list", wd:keyword, pg:page});
  return {
    list: formatVideos(data.list || []),
    page: toInt(data.page),
    pagecount: toInt(data.pagecount),
    total: toInt(data.total)
  };
}

async function detail(vodId) {
  const data = await requestSiteAPI({ac:"detail", ids:vodId});
  const info = data.list?.[0];
  if (!info) throw new Error("未找到影片");
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

module.exports = { home, category, categoryList, search, detail };
