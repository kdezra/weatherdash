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

const el = (tag, props = {}, ...children) => {
  const e = document.createElement(tag)
  Object.assign(e, props)
  children.forEach((c) => e.appendChild(c))
  return e
}

const elT = (t, txt, ...c) => el(t, { innerText: txt }, ...c)
const elS = (t, ...c) => el(t, {}, ...c)

const SPCStormReports = {
  id: "spc-reports",
  name: "SPC Storm Reports Map",
  url: "https://www.spc.noaa.gov/climo/reports/today.gif",
  init: false,
  refresh: function () {
    const img = el("img", { src: this.url, id: this.id + "_img" })
    this.div.appendChild(img)
    this.init = true
  },
  show: function () {
    if (!this.init) this.refresh()
    this.heading.style.display = "block"
    this.wrapper.style.display = "block"
  },
  hide: function () {
    this.heading.style.display = "none"
    this.wrapper.style.display = "none"
  },
}

const SPCReportsESRIMap = {
  id: "spc-esri",
  name: "SPC Storm Reports Map (Interactive)",
  url: "https://www.spc.noaa.gov/climo/gm.php?rpt=today",
  init: false,
  display: function (view) {
    this.heading.style.display = view
    this.wrapper.style.display = view
    this.div.innerHTML = ""
  },
  refresh: function () {
    this.init = true
  },
  show: function () {
    this.display("block")
    const iframe = el("iframe", {
      width: "100%",
      height: "400",
      scrolling: "no",
      src: this.url,
    })
    this.div.appendChild(iframe)
  },
  hide: function () {
    this.display("none")
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
        this.items = [...xml.querySelectorAll("item")]
          .map((i) => new SPCFeedItem(i))
          .sort((a, b) => b.time - a.time)
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

const SPCReportsCSV = {
  id: "spc-csv",
  name: "SPC CSV Reports Feed",
  url: "https://www.spc.noaa.gov/climo/reports/today.csv",
  items: [],
  init: false,
  csv: null,
  refresh: function () {
    this.init = false
    const proxyUrl = proxy + encodeURIComponent(this.url)
    return fetch(proxyUrl)
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error("Network response was not ok.")
      })
      .then((data) => {
        this.csv = window.atob(data.contents.split(",")[1])
        this.init = true
      })
  },
  populate: function () {
    if (!this.csv) {
      this.div.innerText = "Failed to load feed."
      return
    }
    this.div.innerHTML = ""
    const lines = this.csv.trim().split("\n")
    const tables = {
      t: { header: null, rows: [] },
      w: { header: null, rows: [] },
      h: { header: null, rows: [] },
    }
    const ctot = { F_Scale: "t", Speed: "w", Size: "h" }
    let current = null

    for (const line of lines) {
      const cells = line.split(",")
      const headerLine = cells.join(",")
      if (cells[0] == "Time") {
        current = tables[ctot[cells[1]]]
        current.header = cells
      } else if (current) current.rows.push(cells)
    }

    const th = (t) => el("th", { innerText: t })
    const td = (t) => el("td", { innerText: t })
    const makeRow = (r) => el("tr", {}, ...r.map(td))

    const thead = (head) => elS("thead", elS("tr", ...head.map(th)))

    const tableToHTML = ({ header, rows }, title, div) => {
      div.append(
        elT("h3", title),
        el(
          "table",
          { border: 1 , className: "report-table"},
          thead(header),
          el("tbody", {}, ...rows.map(makeRow)),
        ),
      )
    }

    tableToHTML(tables.t, "Tornado Reports", this.div)
    tableToHTML(tables.w, "Wind Reports", this.div)
    tableToHTML(tables.h, "Hail Reports", this.div)
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
    const titleA = el("a", {
      href: this.link,
      target: "_blank",
      innerText: this.title,
    })
    const iconSPAN = elT("span", this.icon)
    const summary = elT("summary", "Show Details")
    const descDIV = el("div", { innerHTML: this.description })
    return el(
      "div",
      { className: "feedItem", id: this.id },
      el("div", { className: "title" }, iconSPAN, titleA),
      el("time", { innerText: this.date }),
      elS("details", summary, descDIV),
    )
  }
}

function makeToggle(id, name) {
  const toggleLab = document.createElement("label")
  const toggle = el("input", { type: "checkbox", id: id + "_toggle" })
  toggleLab.appendChild(toggle)
  toggleLab.append(name)
  return toggleLab
}

const objGroups = {
  all: [SPCStormReports, SPCReportsCSV, SPCReportsESRIMap, SPCRSSFeed],
  activeReportsGroup: {
    name: "Active Reports",
    all: [SPCStormReports, SPCReportsESRIMap, SPCReportsCSV, SPCRSSFeed],
  },
  forecastGroup: {
    name: "Forecast",
    all: [],
  },
  videosGroup: {
    name: "Video",
    all: [],
  },
}

function updateLocalStorage(id, value) {
  let storage = {}
  try {
    storage = JSON.parse(localStorage.__SPCRPTio_storage || '{}')
  } catch (e) {
    console.warn("Invalid JSON in __SPCRPTio_storage, resetting.")
  }
  storage[id] = value
  localStorage.__SPCRPTio_storage = JSON.stringify(storage)
}

function getFromLocalStorage(id) {
  try {
    const store = JSON.parse(localStorage.__SPCRPTio_storage || '{}')
    return store[id] || "Off"
  } catch (e) {
    console.warn("Corrupted __SPCRPTio_storage; returning Off.")
    return "Off"
  }
}

objGroups.all.forEach((obj) => {
  obj.div = el("div", { className: "content" })
  obj.wrapper = el("div", { id: obj.id, className: "object" }, obj.div)
  document.getElementById("objectContainer").appendChild(obj.wrapper)
  obj.heading = el("h2", {
    id: obj.id + "_head",
    className: "objectH2",
    innerText: obj.name,
  })
  obj.heading.style.display = "none"
  obj.toggleLab = makeToggle(obj.id, obj.name)
  obj.toggle = obj.toggleLab.firstChild

  obj.toggle.addEventListener("change", () => {
    obj.toggle.checked
      ? (updateLocalStorage(obj.id, "On"), obj.show())
      : (updateLocalStorage(obj.id, "Off"), obj.hide())
  })

  obj.toggle.checked = getFromLocalStorage(obj.id) == "On"
  obj.toggle.dispatchEvent(new Event("change"))
  
  appendChildren(obj.wrapper, [obj.heading, obj.div])
  document.getElementById("toggles").appendChild(obj.toggleLab)
})

for (var subgroup in objGroups) {
  if (!objGroups[subgroup].name) continue
  let groupLen = objGroups[subgroup].all.length
  let groupName = `${objGroups[subgroup].name} (${groupLen})`
  let toggleLab = makeToggle(subgroup, groupName)
  let toggle = toggleLab.firstChild

  objGroups[subgroup].all.forEach((obj) => {
    toggle.addEventListener("change", () => {
      updateLocalStorage(subgroup, toggle.checked ? "On" : "Off")
      if (obj.toggle.checked != toggle.checked) {
        obj.toggle.checked = toggle.checked
        obj.toggle.dispatchEvent(new Event("change"))
      }
    })
    obj.toggle.addEventListener("change", () => {
      if (!obj.toggle.checked) {
        toggle.checked = false
        updateLocalStorage(subgroup, "Off")
      }
    })
  })

  if (!groupLen) {
    toggle.disabled = true
    toggle.style.cursor = "not-allowed"
  } else {
    toggle.checked = localStorage.getItem(subgroup) == "On"
    toggle.dispatchEvent(new Event("change"))
  }
  document.getElementById("toggle-groups").appendChild(toggleLab)
}