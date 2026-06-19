// 全部优质影视采集API聚合
const sourceList = [
  {name:"TV-如意资源",api:"http://cj.rycjapi.com/api.php/provide/vod/"},
  {name:"TV-电影天堂资源",api:"https://caiji.dyttzyapi.com/api.php/provide/vod/"},
  {name:"TV-百度云资源",api:"https://api.apibdzy.com/api.php/provide/vod/"},
  {name:"TV-非凡影视",api:"http://ffzy5.tv/api.php/provide/vod/"},
  {name:"TV-360资源",api:"https://360zy.com/api.php/provide/vod/"},
  {name:"TV-卧龙资源",api:"https://wolongzyw.com/api.php/provide/vod/"},
  {name:"TV-豆瓣资源",api:"https://dbzy.tv/api.php/provide/vod/"},
  {name:"TV-魔都资源",api:"https://www.mdzyapi.com/api.php/provide/vod/"},
  {name:"TV-最大资源",api:"https://api.zuidapi.com/api.php/provide/vod/"},
  {name:"TV-旺旺短剧tv",api:"https://wwzy.tv/api.php/provide/vod/"},
  {name:"TV-量子资源站",api:"https://cj.lziapi.com/api.php/provide/vod/"},
  {name:"TV-茅台资源",api:"https://caiji.maotaizy.cc/api.php/provide/vod/"},
  {name:"TV-速播资源",api:"https://subocaiji.com/api.php/provide/vod/"},
  {name:"TV-飘零资源",api:"https://p2100.net/api.php/provide/vod/"},
  {name:"TV-新浪点播",api:"https://api.xinlangapi.com/xinlangapi.php/provide/vod/"},
  {name:"TV-红牛资源2",api:"https://www.hongniuzy2.com/api.php/provide/vod/"},
  {name:"TV-影视工厂",api:"https://cj.lziapi.com/api.php/provide/vod/"},
  {name:"TV-豪华资源",api:"https://hhzyapi.com/api.php/provide/vod/"}
];

// 全局搜索：遍历所有源聚合结果
async function search(key) {
  let allResult = [];
  for(let item of sourceList){
    try{
      const res = await fetch(`${item.api}?ac=list&pg=1&wd=${encodeURIComponent(key)}`);
      const data = await res.json();
      if(data.list && data.list.length>0){
        data.list.forEach(v=>{
          allResult.push({
            id: `${item.name}_${v.vod_id}`,
            name: v.vod_name,
            pic: v.vod_pic,
            desc: v.vod_content || "暂无简介",
            year: v.vod_year || "",
            type: v.vod_class || "影视"
          })
        })
      }
    }catch(e){
      continue;
    }
  }
  return allResult;
}

// 播放详情匹配对应源解析播放地址
async function detail(id) {
  const [sourceName, vodId] = id.split("_");
  const target = sourceList.find(s=>s.name === sourceName);
  if(!target) throw "未匹配对应资源站";
  const res = await fetch(`${target.api}?ac=detail&ids=${vodId}`);
  const data = await res.json();
  const info = data.list[0];
  const playList = info.vod_play_url.split("#").map(item=>{
    const [playName, playUrl] = item.split("$");
    return {name:playName, url:playUrl}
  })
  return {
    name: info.vod_name,
    desc: info.vod_content,
    playList: playList
  }
}
