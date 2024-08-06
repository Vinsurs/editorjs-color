export { rangeIsTextNode } from '@vinsurs/selection-utils'
/**
 * @description 用于创建元素的辅助方法
 * @param {string} tagName - 正在创建的元素的名称
 * @param {string|string[]} [classNames] - 附加到元素上的类名
 * @param {Object} [attributes] - 附加到元素上的属性集
 * @returns {HTMLElement}
 */
export function make<K extends keyof HTMLElementTagNameMap>(tagName: K, classNames?: string | string[], attributes?: Record<string, any>): HTMLElementTagNameMap[K] {
    const el = document.createElement(tagName);

    if (Array.isArray(classNames)) {
        el.classList.add(...classNames);
    } else if (classNames) {
        el.classList.add(classNames);
    }

    for (const attrName in attributes) {
        // @ts-ignore
        el[attrName] = attributes[attrName];
    }

    return el;
}
export function CSSClsCreator(scope: string) {
    return (cls?: string) => {
        return scope + (cls ? '__' + cls : '');
    }
}
/**
 * check whether a DOM node is empty node or not
 * @param {Node} node A DOM node to be check
 * @param {object} [opts] options
 * @param {boolean} [opts.preserveBr=true] whether skip br element or not
 * @returns 
 */
export function isEmptyNode(node: Node, opts?: { skipBr: boolean }) {
    opts = Object.assign({ skipBr: true }, opts || {});
    if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.nodeName === "BR" && opts.skipBr) return false
        return !node.hasChildNodes() || node.textContent === ""
    }
    if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue === ""
    }
    return false
}
export function isPlainObject(obj: any): obj is Record<string, any> {
    return Object.prototype.toString.call(obj) === '[object Object]';
}