/* ============================================================================
   Product Inventory Manager
   MCA - Advanced Web Technologies (24MCA301) - Part B
   ----------------------------------------------------------------------------
   Plain TypeScript + browser DOM APIs. No frameworks, no external libraries.
   The file compiles to dist/app.js and is loaded by index.html with `defer`.
   ============================================================================ */

/* ============================================================================
   1. TYPE DEFINITIONS
   ============================================================================ */

/**
 * A product identifier may arrive either as a number (from our own code)
 * or as a string (from the HTML <input> element). This union type makes
 * that dual possibility explicit.
 */
type ProductId = number | string;

/**
 * Core product shape used throughout the application.
 * `tags` is optional because a product may not have any tags.
 */
interface Product {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
  tags?: string[];
}

/**
 * A product that also carries the discount percentage that was applied.
 * This demonstrates INTERFACE EXTENSION.
 */
interface DiscountedProduct extends Product {
  discountPercent: number;
}

/** Allowed message kinds for the message area. */
type MessageType = "success" | "error";

/* ============================================================================
   2. APPLICATION STATE
   ============================================================================ */

/**
 * The in-memory inventory. Starts with a few sample products so the table
 * is not empty on first load.
 */
let products: Product[] = [
  {
    id: 101,
    name: "Wireless Mouse",
    price: 799,
    inStock: true,
    tags: ["electronics", "accessories"],
  },
  {
    id: 102,
    name: "Mechanical Keyboard",
    price: 2499,
    inStock: false,
    tags: ["electronics", "keyboard"],
  },
  {
    id: 103,
    name: "USB-C Hub",
    price: 1299,
    inStock: true,
    tags: ["electronics", "adapter"],
  },
  {
    id: 104,
    name: "Laptop Stand",
    price: 899,
    inStock: true,
    tags: ["accessories"],
  },
];

/** Key used to store the inventory in browser localStorage. */
const STORAGE_KEY: string = "product-inventory";

/** Currently applied discount percentage (0 means "no discount"). */
let discountPercent: number = 0;

/** When true, only in-stock products are shown in the table. */
let showOnlyAvailable: boolean = false;

/* ============================================================================
   3. LOCAL STORAGE PERSISTENCE
   ============================================================================ */

/**
 * Saves the current products array into browser localStorage.
 *
 * JSON.stringify() converts the Product[] object into a string because
 * localStorage can only store string values.
 */
function saveProducts(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

/**
 * Loads products from browser localStorage.
 *
 * If saved data exists, it replaces the default products array.
 * If no saved data exists, the default products remain unchanged.
 */
function loadProducts(): void {
  const savedProducts: string | null =
    localStorage.getItem(STORAGE_KEY);

  if (savedProducts !== null) {
    products = JSON.parse(savedProducts) as Product[];
  }
}

/* ============================================================================
   4. DOM ELEMENT LOOKUPS (safe, null-checked, no `any`)
   ============================================================================ */

/** Returns a generic element or throws if it is missing. */
function getHTMLElement(id: string): HTMLElement {
  const element = document.getElementById(id);

  if (element === null) {
    throw new Error(`Element with id "${id}" was not found in the page.`);
  }

  return element;
}

/** Returns an <input> element or throws if the id does not point to one. */
function getInputElement(id: string): HTMLInputElement {
  const element = document.getElementById(id);

  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Expected an <input> element with id "${id}".`);
  }

  return element;
}

/** Returns a <button> element or throws if the id does not point to one. */
function getButtonElement(id: string): HTMLButtonElement {
  const element = document.getElementById(id);

  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected a <button> element with id "${id}".`);
  }

  return element;
}

/** Returns a <form> element or throws if the id does not point to one. */
function getFormElement(id: string): HTMLFormElement {
  const element = document.getElementById(id);

  if (!(element instanceof HTMLFormElement)) {
    throw new Error(`Expected a <form> element with id "${id}".`);
  }

  return element;
}

/** Returns a <tbody> element or throws if the id does not point to one. */
function getTableBodyElement(id: string): HTMLTableSectionElement {
  const element = document.getElementById(id);

  if (!(element instanceof HTMLTableSectionElement)) {
    throw new Error(`Expected a <tbody> element with id "${id}".`);
  }

  return element;
}

/** Returns a <span> element or throws if the id does not point to one. */
function getSpanElement(id: string): HTMLSpanElement {
  const element = document.getElementById(id);

  if (!(element instanceof HTMLSpanElement)) {
    throw new Error(`Expected a <span> element with id "${id}".`);
  }

  return element;
}

/* --- Cached element references (all ids match index.html) --- */

const productForm: HTMLFormElement =
  getFormElement("product-form");

const productIdInput: HTMLInputElement =
  getInputElement("input-product-id");

const productNameInput: HTMLInputElement =
  getInputElement("input-product-name");

const productPriceInput: HTMLInputElement =
  getInputElement("input-product-price");

const productTagsInput: HTMLInputElement =
  getInputElement("input-product-tags");

const productInStockInput: HTMLInputElement =
  getInputElement("input-product-instock");

const messageArea: HTMLElement =
  getHTMLElement("message-area");

const totalProductsSpan: HTMLSpanElement =
  getSpanElement("total-products");

const productTableBody: HTMLTableSectionElement =
  getTableBodyElement("product-table-body");

const emptyMessageElement: HTMLElement =
  getHTMLElement("empty-message");

const btnShowAll: HTMLButtonElement =
  getButtonElement("btn-show-all");

const btnShowAvailable: HTMLButtonElement =
  getButtonElement("btn-show-available");

const btnApplyDiscount: HTMLButtonElement =
  getButtonElement("btn-apply-discount");

const btnResetForm: HTMLButtonElement =
  getButtonElement("btn-reset-form");

/* ============================================================================
   5. PURE HELPER FUNCTIONS
   ============================================================================ */

/**
 * Converts a raw product id (number OR string) into a valid number.
 * Returns `null` when the value cannot be interpreted as a number.
 * Demonstrates the UNION type in action.
 */
function normalizeProductId(rawId: ProductId): number | null {
  if (typeof rawId === "number") {
    return Number.isFinite(rawId) ? rawId : null;
  }

  const trimmed: string = rawId.trim();

  if (trimmed === "") {
    return null;
  }

  const parsed: number = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Splits the comma-separated tags input into a clean string[].
 * Uses map() and filter() together.
 */
function parseTags(rawTags: string): string[] {
  return rawTags
    .split(",")
    .map((tag: string): string => tag.trim())
    .filter((tag: string): boolean => tag.length > 0);
}

/**
 * Calculates the price after a discount.
 * The default parameter (10) means callers may omit the percentage.
 */
function calculateDiscount(
  price: number,
  discountPercentValue: number = 10
): number {
  const discountAmount: number =
    (price * discountPercentValue) / 100;

  return price - discountAmount;
}

/**
 * Returns NEW DiscountedProduct objects using map().
 * The original product objects are not modified.
 */
function getDiscountedProducts(
  items: Product[],
  discountPercentValue: number = 10
): DiscountedProduct[] {
  return items.map(
    (product: Product): DiscountedProduct => ({
      ...product,
      discountPercent: discountPercentValue,
      price: calculateDiscount(
        product.price,
        discountPercentValue
      ),
    })
  );
}

/**
 * Returns only the products that are currently in stock, using filter().
 */
function getAvailableProducts(items: Product[]): Product[] {
  return items.filter(
    (product: Product): boolean => product.inStock
  );
}

/* ============================================================================
   6. MESSAGE AREA HELPERS
   ============================================================================ */

/** Shows a coloured message (success or error) below the form. */
function showMessage(
  text: string,
  type: MessageType
): void {
  messageArea.textContent = text;
  messageArea.className = `message-area ${type}`;
}

/** Clears the message area completely. */
function clearMessage(): void {
  messageArea.textContent = "";
  messageArea.className = "message-area";
}

/* ============================================================================
   7. RENDERING
   ============================================================================ */

/** Updates the "Total Products" counter in the controls section. */
function updateProductCount(count: number): void {
  totalProductsSpan.textContent = String(count);
}

/**
 * Builds and injects all table rows for the given list of products.
 * Every cell, badge, tag pill and Delete button is created dynamically.
 */
function renderProducts(items: Product[]): void {
  // Clear any previously rendered rows.
  productTableBody.innerHTML = "";

  // When a discount is active, build a lookup of id -> discounted price.
  // getDiscountedProducts() internally uses map().
  const discountedPriceById: Map<number, number> =
    new Map<number, number>();

  if (discountPercent > 0) {
    const discountedList: DiscountedProduct[] =
      getDiscountedProducts(items, discountPercent);

    for (const discounted of discountedList) {
      discountedPriceById.set(
        discounted.id,
        discounted.price
      );
    }
  }

  // Build one row per product.
  for (const product of items) {
    const row: HTMLTableRowElement =
      document.createElement("tr");

    // ---- ID cell ----
    const idCell: HTMLTableCellElement =
      document.createElement("td");

    idCell.textContent = String(product.id);

    // ---- Name cell ----
    const nameCell: HTMLTableCellElement =
      document.createElement("td");

    nameCell.textContent = product.name;

    // ---- Price cell ----
    const priceCell: HTMLTableCellElement =
      document.createElement("td");

    const discountedPrice: number | undefined =
      discountedPriceById.get(product.id);

    if (discountedPrice !== undefined) {
      priceCell.textContent =
        `₹${discountedPrice.toFixed(2)} ` +
        `(was ₹${product.price.toFixed(2)}, ` +
        `${discountPercent}% off)`;
    } else {
      priceCell.textContent =
        `₹${product.price.toFixed(2)}`;
    }

    /* ------------------------------------------------------------------
       BLOCK SCOPE DEMONSTRATION
       ------------------------------------------------------------------
       `priceLabel` is declared with `let` INSIDE this { } block.
       It therefore only exists between these braces.
       ------------------------------------------------------------------ */

    {
      let priceLabel: string =
        discountedPrice !== undefined
          ? "Discounted price"
          : "Regular price";

      priceCell.title = priceLabel;
    }

    // ---- Stock status cell ----
    const stockCell: HTMLTableCellElement =
      document.createElement("td");

    const stockBadge: HTMLSpanElement =
      document.createElement("span");

    stockBadge.className = product.inStock
      ? "stock-status in-stock"
      : "stock-status out-of-stock";

    stockBadge.textContent = product.inStock
      ? "In Stock"
      : "Out of Stock";

    stockCell.appendChild(stockBadge);

    // ---- Tags cell ----
    const tagsCell: HTMLTableCellElement =
      document.createElement("td");

    if (
      product.tags !== undefined &&
      product.tags.length > 0
    ) {
      for (const tag of product.tags) {
        const tagPill: HTMLSpanElement =
          document.createElement("span");

        tagPill.className = "tag-pill";
        tagPill.textContent = tag;

        tagsCell.appendChild(tagPill);
      }
    } else {
      tagsCell.textContent = "—";
    }

    // ---- Action cell (Delete button created dynamically) ----
    const actionCell: HTMLTableCellElement =
      document.createElement("td");

    const deleteButton: HTMLButtonElement =
      document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "btn-delete";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener(
      "click",
      (): void => {
        deleteProduct(product.id);
      }
    );

    actionCell.appendChild(deleteButton);

    // Assemble the row.
    row.appendChild(idCell);
    row.appendChild(nameCell);
    row.appendChild(priceCell);
    row.appendChild(stockCell);
    row.appendChild(tagsCell);
    row.appendChild(actionCell);

    productTableBody.appendChild(row);
  }

  // Show or hide the "no products" message.
  if (items.length === 0) {
    emptyMessageElement.hidden = false;
  } else {
    emptyMessageElement.hidden = true;
  }
}

/**
 * Re-applies the current filter and refreshes both the table and the count.
 * Called after every add / delete / filter / discount action.
 */
function refreshView(): void {
  const visibleProducts: Product[] =
    showOnlyAvailable
      ? getAvailableProducts(products)
      : products;

  renderProducts(visibleProducts);
  updateProductCount(products.length);
}

/* ============================================================================
   8. PRODUCT ACTIONS
   ============================================================================ */

/** Removes a product by id, saves the change, and refreshes the view. */
function deleteProduct(id: number): void {
  products = products.filter(
    (product: Product): boolean =>
      product.id !== id
  );

  // Save updated inventory to localStorage.
  saveProducts();

  showMessage(
    `Product with ID ${id} was deleted.`,
    "success"
  );

  refreshView();
}

/* ============================================================================
   9. EVENT HANDLERS
   ============================================================================ */

/** Handles the "Add Product" form submission. */
function handleAddProduct(event: Event): void {
  event.preventDefault();
  clearMessage();

  // ---- Read raw values from the form ----
  const rawId: string = productIdInput.value;
  const rawName: string = productNameInput.value;
  const rawPrice: string = productPriceInput.value;
  const rawTags: string = productTagsInput.value;
  const inStock: boolean = productInStockInput.checked;

  // ---- Validate the ID (must be a valid number) ----
  const id: number | null =
    normalizeProductId(rawId);

  if (id === null) {
    showMessage(
      "Product ID must be a valid number (e.g. 105).",
      "error"
    );

    productIdInput.focus();
    return;
  }

  if (
    products.some(
      (product: Product): boolean =>
        product.id === id
    )
  ) {
    showMessage(
      `A product with ID ${id} already exists.`,
      "error"
    );

    productIdInput.focus();
    return;
  }

  // ---- Validate the name (must not be empty) ----
  const name: string = rawName.trim();

  if (name === "") {
    showMessage(
      "Product name must not be empty.",
      "error"
    );

    productNameInput.focus();
    return;
  }

  // ---- Validate the price (must be a number >= 0) ----
  const price: number = Number(rawPrice);

  if (
    rawPrice.trim() === "" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    showMessage(
      "Price must be a number greater than or equal to 0.",
      "error"
    );

    productPriceInput.focus();
    return;
  }

  // ---- Build the new product object ----
  const tags: string[] = parseTags(rawTags);

  const newProduct: Product = {
    id,
    name,
    price,
    inStock,
    tags: tags.length > 0 ? tags : undefined,
  };

  products.push(newProduct);

  // Save updated inventory to localStorage.
  saveProducts();

  // ---- Reset the form and restore the default checkbox state ----
  productForm.reset();
  productInStockInput.checked = true;

  showMessage(
    `Product "${name}" was added successfully.`,
    "success"
  );

  refreshView();
}

/** "Show All Products" - clears the in-stock filter. */
function handleShowAll(): void {
  showOnlyAvailable = false;

  clearMessage();
  refreshView();

  showMessage(
    `Showing all ${products.length} product(s).`,
    "success"
  );
}

/** "Show Available Products" - keeps only in-stock items. */
function handleShowAvailable(): void {
  showOnlyAvailable = true;

  const available: Product[] =
    getAvailableProducts(products);

  clearMessage();
  refreshView();

  showMessage(
    `Showing ${available.length} available product(s).`,
    "success"
  );
}

/** "Apply 10% Discount" - sets the discount and re-renders. */
function handleApplyDiscount(): void {
  discountPercent = 10;

  clearMessage();
  refreshView();

  showMessage(
    "A 10% discount has been applied to all products.",
    "success"
  );
}

/** Reset button - also clears any leftover message. */
function handleResetForm(): void {
  clearMessage();
}

/* ============================================================================
   10. EVENT LISTENERS
   ============================================================================ */

productForm.addEventListener(
  "submit",
  handleAddProduct
);

btnShowAll.addEventListener(
  "click",
  handleShowAll
);

btnShowAvailable.addEventListener(
  "click",
  handleShowAvailable
);

btnApplyDiscount.addEventListener(
  "click",
  handleApplyDiscount
);

btnResetForm.addEventListener(
  "click",
  handleResetForm
);

/* ============================================================================
   11. INITIAL LOAD
   ----------------------------------------------------------------------------
   First load saved products from localStorage.
   If nothing has been saved yet, the default products remain.
   Then render the inventory.
   ============================================================================ */

loadProducts();

refreshView();

showMessage(
  "Inventory loaded. Add a product or use the controls above.",
  "success"
);