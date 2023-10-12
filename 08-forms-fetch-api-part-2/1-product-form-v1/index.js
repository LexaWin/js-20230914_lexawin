import escapeHtml from "./utils/escape-html.js";
import fetchJson from "./utils/fetch-json.js";

const IMGUR_CLIENT_ID = "28aaa2e823b03b1";
const BACKEND_URL = "https://course-js.javascript.ru";

export default class ProductForm {
  element;
  subElements;
  formData;

  constructor(productId) {
    this.productId = productId;
    this.formElements = {
      title: null,
      description: null,
      quantity: null,
      subcategory: null,
      status: null,
      price: null,
      discount: null,
    };
    this.formData = {
      title: "",
      description: "",
      quantity: 1,
      subcategory: "",
      status: 1,
      price: 100,
      discount: 0,
      images: [],
    };

    window.form = this; // TODO rid this out
  }

  createElement() {
    const element = document.createElement("div");
    element.classList.add("product-form");
    return element;
  }

  createElementContentTemplate() {
    return `
      <form data-element="productForm" class="form-grid">
        <div class="form-group form-group__half_left">
          <fieldset>
            <label class="form-label">Название товара</label>
            <input
              id="title"
              required=""
              type="text"
              name="title"
              class="form-control"
              placeholder="Название товара"
            >
          </fieldset>
        </div>
        <div class="form-group form-group__wide">
          <label class="form-label">Описание</label>
          <textarea
            id="description"
            required=""
            class="form-control"
            name="description"
            placeholder="Описание товара"
          ></textarea>
        </div>
        <div class="form-group form-group__wide">
          <label class="form-label">Фото</label>
          <div data-element="imageListContainer"></div>
          <button type="button" id="uploadImage" name="uploadImage" class="button-primary-outline">
            <span>Загрузить</span>
          </button>
        </div>
        <div class="form-group form-group__half_left">
          <label class="form-label">Категория</label>
          <select id="subcategory" class="form-control" id="subcategory" name="subcategory"></select>
        </div>
        <div class="form-group form-group__half_left form-group__two-col">
          <fieldset>
            <label class="form-label">Цена ($)</label>
            <input id="price" required="" type="number" name="price" class="form-control" placeholder="100">
          </fieldset>
          <fieldset>
            <label class="form-label">Скидка ($)</label>
            <input
              id="discount"
              required=""
              type="number"
              name="discount"
              class="form-control"
              placeholder="0"
            >
          </fieldset>
        </div>
        <div class="form-group form-group__part-half">
          <label class="form-label">Количество</label>
          <input id="quantity" required="" type="number" class="form-control" name="quantity" placeholder="1">
        </div>
        <div class="form-group form-group__part-half">
          <label class="form-label">Статус</label>
          <select id="status" class="form-control" name="status">
            <option value="1">Активен</option>
            <option value="0">Неактивен</option>
          </select>
        </div>
        <div class="form-buttons">
          <button type="submit" name="save" class="button-primary-outline">
            ${this.productId ? "Сохранить" : "Добавить"} товар
          </button>
        </div>
      </form>
    `;
  }

  createSubcategoriesTemplate(subcategories) {
    return subcategories.reduce(
      (result, { title: categoryTitle, subcategories }) =>
        result +
        subcategories.reduce(
          (result, { id, title: subcategoryTitle }, index) =>
            result + `<option value="${id}">${escapeHtml(`${categoryTitle} > ${subcategoryTitle}`)}</option>`,
          ""
        ),
      ""
    );
  }

  createImageItemTemplate(item) {
    return `
      <li class="products-edit__imagelist-item sortable-list__item">
        <input type="hidden" name="url" value="${item.url}">
        <input type="hidden" name="source" value="${item.source}">
        <span>
          <img src="icon-grab.svg" data-grab-handle="" alt="grab">
          <img class="sortable-table__cell-img" alt="Image" src="${item.url}">
          <span>${item.source}</span>
        </span>
        <button type="button">
          <img src="icon-trash.svg" data-delete-handle="" alt="delete">
        </button>
      </li>
    `;
  }

  createImageListTemplate() {
    return `
      <ul class="sortable-list">
        ${this.formData.images.reduce((result, item) => result + this.createImageItemTemplate(item), "")}
      </ul>
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

  initFormElements() {
    for (const key in this.formElements) {
      const element = this.subElements.productForm.querySelector(`#${key}`);
      this.formElements[key] = element;
    }
  }

  setFormElementsValues() {
    for (const [key, formElement] of Object.entries(this.formElements)) {
      formElement.value = this.formData[key];
    }
  }

  async getSubcategories() {
    const url = `${BACKEND_URL}/api/rest/categories?_sort=weight&_refs=subcategory`;
    return await fetchJson(url);
  }

  async getFormDataByProductId(id) {
    const url = `${BACKEND_URL}/api/rest/products?id=${id}`;
    return await fetchJson(url);
  }

  async save() {
    const url = `${BACKEND_URL}/api/rest/products`;

    try {
      await fetchJson(url, {
        method: this.productId ? "PATCH" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: this.formData.id,
          title: this.formData.title,
          description: this.formData.description,
          subcategory: this.formData.subcategory,
          price: this.formData.price,
          quantity: this.formData.quantity,
          discount: this.formData.discount,
          status: this.formData.status,
          images: this.formData.images,
        }),
      });

      this.dispatchProductEvent();
    } catch (error) {
      console.error(error);
    }
  }

  createEvents() {
    this.subElements.productForm.addEventListener("submit", this.handleProductFormSubmit);
  }

  removeEvents() {
    this.subElements.productForm.removeEventListener("submit", this.handleProductFormSubmit);
  }

  dispatchProductEvent() {
    const eventType = this.productId ? "product-updated" : "product-saved";
    const event = new CustomEvent(eventType);
    this.element.dispatchEvent(event);
  }

  handleProductFormSubmit = async (e) => {
    e.preventDefault();
    await this.save();
  };

  async render() {
    this.element = this.createElement();
    this.element.innerHTML = this.createElementContentTemplate();

    this.subElements = this.getSubElements();

    const subcategories = await this.getSubcategories();
    const subcategory = this.element.querySelector("#subcategory");
    subcategory.innerHTML = this.createSubcategoriesTemplate(subcategories);

    const subcategoryChildren = subcategory.children;
    if (subcategoryChildren.length) {
      this.formData.subcategory = subcategoryChildren[0].value;
    }

    this.initFormElements();

    if (this.productId) {
      this.formData = (await this.getFormDataByProductId(this.productId))[0];
    }

    this.setFormElementsValues();
    this.subElements.imageListContainer.innerHTML = this.createImageListTemplate();

    this.createEvents();

    return this.element;
  }

  remove() {
    this.element.remove();
  }

  destroy() {
    this.removeEvents();
    this.remove();
  }
}
