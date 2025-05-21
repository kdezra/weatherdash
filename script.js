const proxy = "https://api.allorigins.win/get?url="

function getDateString(date, delay = 0) {
  const tzOffset = date.getHours() - date.getUTCHours()
  date.setHours(date.getHours() - delay + tzOffset)
  const ds = date.toISOString().split("T")[0].split("-")
  return ds[0].slice(-2) + ds[1] + ds[2]
}

function appendChildren(parent, children) {
  children.forEach((child) => {
    parent.appendChild(child)
  })
}

const SPCStormReports = {
  id: "spc-reports",
  embedUrl: "https://www.spc.noaa.gov/climo/reports/000101_prt_rpts.html",
  gifUrl: "https://www.spc.noaa.gov/climo/reports/000101_rpts.gif",
  init: false,
  refresh: function () {
    this.init = false
    const date = new Date()
    var dateStr = getDateString(date, 6)
    this.embedUrl = `https://www.spc.noaa.gov/climo/reports/${dateStr}_prt_rpts.html`
    this.gifUrl = `https://www.spc.noaa.gov/climo/reports/${dateStr}_rpts.gif`
    this.init = true
  },
  show: async function () {
    if (!this.init) this.refresh()

    const embed = document.createElement("embed")
    embed.type = "text/html"
    embed.src = this.embedUrl
    embed.className = "spc-embed"
    this.div.appendChild(embed)
  },
  hide: async function () {
    if (!this.init) this.refresh()
    this.div.innerHTML = `<img src="${this.gifUrl}" id="spc-rpt-gif">`
  },
}

const SPCReportsESRIMap = {
  id: "spc-esri",
  init: false,
  refresh: function () {
    this.init = false
    this.init = true
  },
  show: function () {
    const dateStr = getDateString(new Date(), 6)
    this.div.innerHTML = `<iframe width="500" height="400" frameborder="0" scrolling="no" marginheight="0" marginwidth="0"
src="https://www.spc.noaa.gov/climo/gm.php?rpt=${dateStr}_rpts"></iframe>`
  },
  hide: function () {
    this.div.innerHTML = ""
  },
}

const SPCRSSFeed = {
  id: "spc-rss",
  url: "https://www.spc.noaa.gov/products/spcrss.xml",
  items: [],
  init: false,
  refresh: function () {
    const proxyUrl = proxy + encodeURIComponent(this.url)
    return fetch(proxyUrl)
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error("Network response was not ok.")
      })
      .then((data) => {
        const xml = new DOMParser().parseFromString(
          data.contents,
          "application/xml",
        )
        const items = xml.querySelectorAll("item")
        this.items = new Array(...items).map((i) => new SPCFeedItem(i))
        this.init = true
      })
      .catch((err) => console.log("Fetch Error:", err))
  },
  populate: function () {
    if (this.items.length == 0) {
      this.div.innerText = "Failed to load feed."
      return
    }
    this.items.forEach((i) => this.div.appendChild(i.DOM()))
  },
  show: async function () {
    if (!this.init) await this.refresh()
    const heading = document.createElement("h2")
    heading.id = "rss-head"
    heading.innerText = "SPC RSS Feed"
    this.div.appendChild(heading)
    this.populate()
  },
  hide: function () {
    this.div.innerHTML = ""
  },
}

const objs = [SPCStormReports, SPCReportsESRIMap, SPCRSSFeed]

class SPCFeedItem {
  constructor(item) {
    this.title = item.querySelector("title")?.textContent || "No title"
    this.link = item.querySelector("link")?.textContent || "#"
    this.pubDate = item.querySelector("pubDate")?.textContent || ""
    this.description = item.querySelector("description")?.textContent || ""
  }
  get icon() {
    if (/tornado/i.test(this.title)) return "🌪️"
    if (/watch/i.test(this.title)) return "🕒"
    if (/meso/i.test(this.title)) return "🌀"
    if (/outlook/i.test(this.title)) return "🧭"
    return "📄"
  }
  get date() {
    return new Date(this.pubDate).toLocaleString()
  }
  get id() {
    let stripped_title = this.title.replace(/\s/g, "")
    let fmt_date = getDateString(new Date(this.pubDate))
    return stripped_title + "-" + fmt_date
  }
  DOM() {
    const titleA = document.createElement("a")
    titleA.href = this.link
    titleA.target = "_blank"
    titleA.innerText = this.title

    const iconSPAN = document.createElement("span")
    iconSPAN.innerText = this.icon

    const titleDIV = document.createElement("div")
    titleDIV.className = "title"
    appendChildren(titleDIV, [iconSPAN, titleA])

    const dateTIME = document.createElement("time")
    dateTIME.innerText = this.date

    const summary = document.createElement("summary")
    summary.innerText = "Show Details"

    const descDIV = document.createElement("div")
    descDIV.innerHTML = this.description

    const details = document.createElement("details")
    appendChildren(details, [summary, descDIV])

    const wrapperDIV = document.createElement("div")
    wrapperDIV.className = "feedItem"
    wrapperDIV.id = this.id
    appendChildren(wrapperDIV, [titleDIV, dateTIME, details])

    return wrapperDIV
  }
}

objs.forEach((obj) => {
  obj.div = document.getElementById(obj.id)
  obj.toggle = document.getElementById(obj.id + "_toggle")
  obj.toggle.addEventListener("change", () => {
    obj.toggle.checked
      ? (localStorage.setItem(obj.id, "On"), obj.show())
      : (localStorage.setItem(obj.id, "Off"), obj.hide())
  })
  obj.toggle.checked = localStorage.getItem(obj.id) == "On"
  obj.toggle.dispatchEvent(new Event("change"))
})
