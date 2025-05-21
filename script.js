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
  name: "Today's SPC Storm Reports",
  embedUrl: "https://www.spc.noaa.gov/climo/reports/today_prt_rpts.html",
  gifUrl: "https://www.spc.noaa.gov/climo/reports/today.gif",
  init: false,
  refresh: function () {
    this.init = true
  },
  show: function () {
    this.heading.style.display = "block"
    if (!this.init) this.refresh()
    this.div.innerHTML = ""
    const embed = document.createElement("embed")
    embed.type = "text/html"
    embed.src = this.embedUrl
    embed.className = "spc-embed"
    this.div.appendChild(embed)
  },
  hide: function () {
    this.heading.style.display = "block"
    if (!this.init) this.refresh()
    this.div.innerHTML = ""
    const img = document.createElement("img")
    img.src = this.gifUrl
    img.id = "spc-rpt-gif"
    this.div.appendChild(img)
  },
}

const SPCReportsESRIMap = {
  id: "spc-esri",
  name: "SPC Storm Reports Map (Interactive)",
  url: "https://www.spc.noaa.gov/climo/gm.php?rpt=today",
  init: false,
  refresh: function () {
    this.init = true
  },
  show: function () {
    this.heading.style.display = "block"
    this.wrapper.style.display = "block"
    this.div.innerHTML = ""
    const iframe = document.createElement("iframe")
    const attrs = {
      width: "100%",
      height: "400",
      scrolling: "no",
      src: this.url,
    }
    for (var k in attrs) iframe.setAttribute(k, attrs[k])
    this.div.appendChild(iframe)
  },
  hide: function () {
    this.heading.style.display = "none"
    this.wrapper.style.display = "none"
    this.div.innerHTML = ""
  },
}

const SPCRSSFeed = {
  id: "spc-rss",
  name: "SPC RSS Feed",
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
        this.items.sort((a, b) => -1 * (a.time - b.time))
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
    this.heading.style.display = "block"
    this.wrapper.style.display = "block"
    if (!this.init) await this.refresh()
    this.populate()
  },
  hide: function () {
    this.heading.style.display = "none"
    this.wrapper.style.display = "none"
    this.div.innerHTML = ""
  },
}

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
  get time() {
    return new Date(this.pubDate).getTime()
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

function makeToggle(id, name) {
  const toggleLab = document.createElement("label")
  const toggle = document.createElement("input")
  toggle.type = "checkbox"
  toggle.id = id + "_toggle"
  toggleLab.appendChild(toggle)
  toggleLab.append(name)
  return toggleLab
}

const objGroups = {
  all: [SPCStormReports, SPCReportsESRIMap, SPCRSSFeed],
  activeReports: {
    name: "Active Reports",
    all: [SPCStormReports, SPCReportsESRIMap, SPCRSSFeed],
  },
  forecast: {
    name: "Forecast",
    all: [],
  },
}

objGroups.all.forEach((obj) => {
  obj.wrapper = document.getElementById(obj.id)
  obj.div = document.createElement("div")
  obj.wrapper.className = "object"
  obj.div.className = "content"
  obj.heading = document.createElement("h2")
  obj.heading.id = obj.id + "_head"
  obj.heading.className = "objectH2"
  obj.heading.innerText = obj.name
  obj.heading.style.display = "none"
  obj.toggleLab = makeToggle(obj.id, obj.name)
  obj.toggle = obj.toggleLab.firstChild

  obj.toggle.addEventListener("change", () => {
    obj.toggle.checked
      ? (localStorage.setItem(obj.id, "On"), obj.show())
      : (localStorage.setItem(obj.id, "Off"), obj.hide())
  })

  obj.toggle.checked = localStorage.getItem(obj.id) == "On"
  obj.toggle.dispatchEvent(new Event("change"))
  appendChildren(obj.wrapper, [obj.heading, obj.div])
  document.getElementById("toggles").appendChild(obj.toggleLab)
})

for (var subgroup in objGroups) {
  if (!objGroups[subgroup].name) continue
  let groupName = objGroups[subgroup].name
  let toggleLab = makeToggle(subgroup, groupName)
  let toggle = toggleLab.firstChild
  
  objGroups[subgroup].all.forEach((obj) => {
    toggle.addEventListener("change", () => {
      localStorage.setItem(groupName, toggle.checked ? "On" : "Off")
      if (obj.toggle.checked != toggle.checked) {
        obj.toggle.checked = toggle.checked
        obj.toggle.dispatchEvent(new Event("change"))
      }
    })
    obj.toggle.addEventListener("change", () => {
      if (!obj.toggle.checked) {
        toggle.checked = false
        localStorage.setItem(groupName, "Off")
      }
    })
  })
  
  if (!objGroups[subgroup].all.length) {
  	toggle.disabled = true
    toggle.style.cursor = "not-allowed"
  } else {
    toggle.checked = localStorage.getItem(groupName) == "On"
    toggle.dispatchEvent(new Event("change"))
  }
  document.getElementById("toggle-groups").appendChild(toggleLab)
}
