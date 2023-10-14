export default class RangePicker {
  element;
  subElements;
  selectedRange;
  leftCalendar;
  rightCalendar;
  leftCalendarDate;
  rightCalendarDate;

  constructor({ from = null, to = null } = {}) {
    this.selectedRange = { dateFrom: from, dateTo: to };
    this.cellClicksCount = 0;

    this.render();

    window.rangePicker = this; // TODO: delete this
  }

  createElement() {
    const element = document.createElement("div");
    element.classList.add("rangepicker");

    return element;
  }

  createElementContentTemplate() {
    return `
      <div class="rangepicker__input" data-element="input">
        <span data-element="from">${this.selectedRange.dateFrom.toLocaleDateString()}</span> -
        <span data-element="to">${this.selectedRange.dateTo.toLocaleDateString()}</span>
      </div>
      <div class="rangepicker__selector" data-element="selector"></div>
    `;
  }

  createSelectorContentTemplate() {
    const dateTo = this.selectedRange.dateTo ? this.selectedRange.dateTo : new Date();
    const leftCalendarDate = RangePickerDate.getPrevMonthFirstDate(dateTo);
    const rightCalendarDate = RangePickerDate.getFirstDateOfMonth(dateTo);
    this.leftCalendar = new RangePickerCalendar(leftCalendarDate, this.selectedRange);
    this.rightCalendar = new RangePickerCalendar(rightCalendarDate, this.selectedRange);

    return `
      <div class="rangepicker__selector-arrow"></div>
      <div class="rangepicker__selector-control-left"></div>
      <div class="rangepicker__selector-control-right"></div>
    `;
  }

  getSubElements() {
    const subElements = {};
    const elements = this.element.querySelectorAll("[data-element]");

    for (const element of elements) {
      const name = element.dataset.element;
      subElements[name] = element;
    }

    return subElements;
  }

  createEvents() {
    this.subElements.input.addEventListener("click", this.handleInputClick);
    this.subElements.selector.addEventListener("click", this.handleSelectorClick);
  }

  removeEvents() {
    this.subElements.input.removeEventListener("click", this.handleInputClick);
    this.subElements.selector.removeEventListener("click", this.handleSelectorClick);
  }

  handleInputClick = () => {
    this.element.classList.toggle("rangepicker_open");
    this.cellClicksCount = 0;

    if (!this.subElements.selector.innerHTML) {
      this.subElements.selector.innerHTML = this.createSelectorContentTemplate();
      this.subElements.selector.append(this.leftCalendar.element);
      this.subElements.selector.append(this.rightCalendar.element);
    }
  };

  handleSelectorClick = (e) => {
    const cell = e.target.closest(".rangepicker__cell");

    if (!cell) return;

    this.cellClicksCount++;

    if (this.cellClicksCount === 1) {
      this.selectedRange.dateFrom = new Date(cell.dataset.value);
      this.selectedRange.dateTo = null;
    } else {
      const newDateTo = new Date(cell.dataset.value);
      if (newDateTo.getTime() < this.selectedRange.dateFrom.getTime()) {
        this.selectedRange.dateTo = this.selectedRange.dateFrom;
        this.selectedRange.dateFrom = newDateTo;
      } else {
        this.selectedRange.dateTo = newDateTo;
      }
      this.close();
    }

    this.updateCalendar();
  };

  render() {
    this.element = this.createElement();
    this.element.innerHTML = this.createElementContentTemplate();

    this.subElements = this.getSubElements();

    this.createEvents();
  }

  updateCalendar() {
    this.leftCalendar.updateClasses(this.selectedRange);
    this.rightCalendar.updateClasses(this.selectedRange);
  }

  close() {
    this.element.classList.remove("rangepicker_open");
  }

  remove() {
    this.element.remove();
  }

  destroy() {
    this.removeEvents();
    this.remove();
  }
}

class RangePickerCalendar {
  constructor(date, selectedRange) {
    if (!(date instanceof Date)) throw new Error("You must define the date!");

    this.date = date;
    this.selectedRange = selectedRange;

    this.render();
  }

  createElement() {
    const element = document.createElement("div");
    element.classList.add("rangepicker__calendar");

    return element;
  }

  createElementContentTemplate() {
    const monthName = RangePickerDate.getLongMonthName(this.date);

    return `
      <div class="rangepicker__month-indicator">
        <time datetime="${monthName}">${monthName}</time>
      </div>
      <div class="rangepicker__day-of-week">
        <div>Пн</div>
        <div>Вт</div>
        <div>Ср</div>
        <div>Чт</div>
        <div>Пт</div>
        <div>Сб</div>
        <div>Вс</div>
      </div>
      <div class="rangepicker__date-grid">
        ${this.getDateCellsTemplate()}
      </div>
    `;
  }

  getDateCellsTemplate() {
    const dayOfWeekOfFirstDayOfMonth = RangePickerDate.getDayOfWeek(this.date);
    const nextMonthFirstDate = RangePickerDate.getNextMonthFirstDate(this.date);

    let result = "";
    const currentDate = new Date(this.date); // TODO: fix wrong iso string (gives 21 hour of last day)

    while (currentDate.getTime() < nextMonthFirstDate.getTime()) {
      const day = currentDate.getDate();

      result += `
        <button
          type="button"
          class="rangepicker__cell"
          data-value="${RangePickerDate.getLocalISOString(currentDate)}"
          ${day === 1 ? `style = "--start-from: ${dayOfWeekOfFirstDayOfMonth}"` : ""}
        >
          ${day}
        </button>
      `;

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  render() {
    this.element = this.createElement();
    this.element.innerHTML = this.createElementContentTemplate();
    this.updateClasses(this.selectedRange);
  }

  updateClasses(selectedRange) {
    const { dateFrom, dateTo } = selectedRange;
    const cells = this.element.querySelectorAll(".rangepicker__cell");

    for (const cell of cells) {
      cell.className = "rangepicker__cell";

      const date = new Date(cell.dataset.value);

      if (dateFrom && date.getTime() === dateFrom.getTime()) cell.classList.add("rangepicker__selected-from");
      if (dateFrom && dateTo && date.getTime() > dateFrom.getTime() && date.getTime() < dateTo.getTime()) {
        cell.classList.add("rangepicker__selected-between");
      }
      if (dateTo && date.getTime() === dateTo.getTime()) cell.classList.add("rangepicker__selected-to");
    }
  }
}

class RangePickerDate {
  static getFirstDateOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
  static getPrevMonthFirstDate = (date) => new Date(date.getFullYear(), date.getMonth() - 1, 1);
  static getNextMonthFirstDate = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);
  static getLongMonthName = (date) => date.toLocaleDateString("default", { month: "long" });
  static getDayOfWeek = (date) => {
    let dayOfWeek = date.getDay();
    if (dayOfWeek === 0) return 7;
    return dayOfWeek;
  };
  static getLocalISOString = (date) => {
    const offset = date.getTimezoneOffset();
    const offsetAbs = Math.abs(offset);
    const isoString = new Date(date.getTime() - offset * 60 * 1000).toISOString();
    return `${isoString.slice(0, -1)}${offset > 0 ? "-" : "+"}${String(Math.floor(offsetAbs / 60)).padStart(
      2,
      "0"
    )}:${String(offsetAbs % 60).padStart(2, "0")}`;
  };
}
