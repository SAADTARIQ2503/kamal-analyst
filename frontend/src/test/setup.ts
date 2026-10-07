import "@testing-library/jest-dom/vitest";

const size = { offsetHeight: 480, offsetWidth: 800, clientHeight: 480, clientWidth: 800 };
for (const [key, value] of Object.entries(size)) {
  Object.defineProperty(HTMLElement.prototype, key, { configurable: true, value });
}
Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, bottom: 480, right: 800, width: 800, height: 480, toJSON() {} });
