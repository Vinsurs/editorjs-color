import { type InlineTool, type InlineToolConstructorOptions, type API, type ToolConfig } from "@editorjs/editorjs";
import { IconColor } from "@codexteam/icons"
import { CSSClsCreator, make, isPlainObject, rangeIsTextNode, isEmptyNode } from "./utils/index"
import "./index.scss"

const getCSSCls = CSSClsCreator('ce-inline-tool--color')

type ColorReceiver = (defColors: string[]) => false | string[]
export type Config = ToolConfig<{
    backgroundColors?: false | string[] | ColorReceiver
    /** @default 'background color' */
    backgroundColorLabel?: string
    /** @default 'clear' */
    defaultItemLable?: string
    frontColors?: false | string[] | ColorReceiver
    /** @default 'front color' */
    frontColorLabel?: string
    /** @default 'Ctrl+J' */
    shortcut?: string
    /** @default 'pallette' */
    title?: string
}>
type ActionNodes = {
    actionsContainer: HTMLElement | null
    tokenEl: HTMLElement | null
}
/**
 * inline color palette plugin for editorjs
 * @plugin ColorTool
 * @config {Config}
 */
export class ColorTool implements InlineTool {
    private api: API;
    // @ts-ignore
    private config: Config;
    private actionNodes: ActionNodes;
    private _showActions: boolean;
    private range: Range | null;
    static get isInline() {
        return true
    }
    static get sanitize() {
        return {
            [ColorTool.colorToken.tag]: true
        }
    }
    static _shortcut = "Ctrl+J"
    static get shortcut() {
        return this._shortcut
    }
    static _title = "pallette"
    static get title() {
        return this._title
    }
    static get defColors() {
        return {
            frontColors: [
                "#8c8c8c", // 灰色
                "#5c5c5c", // 深灰色
                "#a3431f", // 棕色
                "#f06b05", // 橙色
                "#dfab01", // 黄色
                "#038766", // 绿色
                "#0575c5", // 蓝色
                "#4a52c7", // 靛蓝色
                "#8831cc", // 紫色
                "#c815b6", // 粉色
                "#e91e2c", // 红色
            ],
            backgroundColors: [
                "#f1f1f1", // 白灰
                "#dedede", // 暗银
                "#edd9d2", // 浅棕
                "#fce1cd", // 鲜橘
                "#fcf4cc", // 淡黄
                "#cde7e0", // 浅绿
                "#cde3f3", // 天蓝
                "#dbdcf4", // 雾蓝
                "#e7d6f5", // 轻紫
                "#f4d0f0", // 熏粉
                "#fbd2d5", // 将红
            ]
        }
    }
    static get colorToken() {
        return {
            tag: 'SPAN',
            className: getCSSCls("token")
        }
    }
    static get defTokenSymbol() {
        return {
            frontColors: '__frontColors__',
            backgroundColors: "__backgroundColors__"
        }
    }
    get showActions() {
        return this._showActions
    }
    set showActions(state: boolean) {
        this._showActions = state
        this.actionNodes.actionsContainer && (this.actionNodes.actionsContainer.hidden = !state);
    }
    constructor({ api, config }: InlineToolConstructorOptions) {
        this.api = api
        this.handleConfig(config)
        this._showActions = false
        this.actionNodes = {
            actionsContainer: null,
            tokenEl: null
        }
        this.range = null
    }
    handleConfig(config: Config) {
        this.config = config
        const defSettings = {
            frontColorLabel: "front color",
            backgroundColorLabel: "background color",
            defaultItemLable: "clear"
        }
        if (!this.config || !isPlainObject(this.config)) {
            this.config = {
                frontColors: ColorTool.defColors.frontColors,
                backgroundColors: ColorTool.defColors.backgroundColors,
                ...defSettings
            }
            return;
        }
        ;["frontColors", "backgroundColors"].forEach(setting => {
            if (setting in this.config) {
                if (typeof this.config[setting] === "function") {
                    this.config[setting] = this.config[setting].call(null, ColorTool.defColors[setting].concat())
                } else if (!Array.isArray(this.config[setting]) && this.config[setting] !== false) {
                    this.config[setting] = ColorTool.defColors[setting]
                }
            } else {
                this.config[setting] = ColorTool.defColors[setting]
            }
        })
        ;["title", "shortcut"].forEach(setting => {
            if (setting in this.config) {
                ColorTool['_' + setting] = this.config[setting]
            }
        })
        ;["frontColorLabel", "backgroundColorLabel"].forEach(setting => {
            if (!(setting in this.config)) {
                this.config[setting] = defSettings[setting]
            }
        })
    }
    createTokenElement() {
        return make(ColorTool.colorToken.tag as keyof HTMLElementTagNameMap, ColorTool.colorToken.className)
    }
    findClosestTokenElement() {
        return this.api.selection.findParentTag(ColorTool.colorToken.tag, ColorTool.colorToken.className)
    }
    isTokenElement(node: Node) {
        return node.nodeType === Node.ELEMENT_NODE 
            && node.nodeName === ColorTool.colorToken.tag
            && (node as Element).classList.contains(ColorTool.colorToken.className)
    }
    isBlockContainer(node: Node) {
        return node.nodeType === Node.ELEMENT_NODE
            && node.nodeName === "DIV"
            && (node as Element).classList.contains(this.api.styles.block)
    }
    render(): HTMLButtonElement {
        const button = make('button', [this.api.styles.inlineToolButton, getCSSCls()])
        button.type = "button"
        button.innerHTML = IconColor
        return button
    }
    checkState(selection: Selection): boolean {
        return selection.isCollapsed
    }
    surround(range: Range): void {
        this.range = range
        this.toggleActions()
    }
    clear(): void {
        this.actionNodes.actionsContainer = null
        this.actionNodes.tokenEl = null
        this.range = null
    }
    toggleActions(force?: boolean) {
        if (typeof force === "boolean") {
            this.showActions = force
        } else {
            this.showActions = !this.showActions
        }

    }
    renderActions(): HTMLElement {
        this.actionNodes.actionsContainer = make("div", getCSSCls("actions-container"))
        this.showActions = false
        this.renderTextColorAction()
        this.renderBgColorAction()
        return this.actionNodes.actionsContainer
    }
    renderTextColorAction(): void {
        if (this.config.frontColors === false) return
        const textColorContainer = make("div")
        const textColorLabel = make("div", getCSSCls("action-label"))
        textColorLabel.textContent = this.config.frontColorLabel!
        textColorContainer.append(textColorLabel)
        const textColorList = make("ul", [getCSSCls("action-list"), getCSSCls("action-list-text-color")])
        this.renderDefaultTextColorAction(textColorList)
        ;(this.config.frontColors as string[]).forEach(color => {
            const colorLi = make("li", [getCSSCls("action-list-item")])
            colorLi.appendChild(document.createTextNode("A"))
            colorLi.style.color = color
            this.api.listeners.on(colorLi, "click", this.handleColorChange.bind(this, color, "textColor", textColorList))
            textColorList.append(colorLi)
        })
        textColorContainer.append(textColorList)
        this.actionNodes.actionsContainer!.append(textColorContainer)
    }
    renderDefaultTextColorAction(hoist: HTMLElement): void {
        const colorLi = make("li", [getCSSCls("action-list-item")])
        colorLi.appendChild(document.createTextNode(this.config.defaultItemLable!))
        colorLi.style.color = "#000"
        colorLi.style.fontSize = "12px"
        this.api.listeners.on(colorLi, "click", this.handleColorChange.bind(this, ColorTool.defTokenSymbol.frontColors, "textColor", hoist))
        hoist.append(colorLi)
    }
    renderBgColorAction(): void {
        if (this.config.frontColors === false) return
        const bgColorContainer = make("div")
        const bgColorLabel = make("div", getCSSCls("action-label"))
        bgColorLabel.textContent = this.config.backgroundColorLabel!
        bgColorContainer.append(bgColorLabel)
        const bgColorList = make("ul", [getCSSCls("action-list"), getCSSCls("action-list-bg-color")])
        this.renderDefaultBgColorAction(bgColorList)
        ;(this.config.backgroundColors as string[]).forEach(color => {
            const colorLi = make("li", [getCSSCls("action-list-item")])
            colorLi.style.backgroundColor = color
            this.api.listeners.on(colorLi, "click", this.handleColorChange.bind(this, color, "backgroundColor", bgColorList))
            bgColorList.append(colorLi)
        })
        bgColorContainer.append(bgColorList)
        this.actionNodes.actionsContainer!.append(bgColorContainer)
    }
    renderDefaultBgColorAction(hoist: HTMLElement): void {
        const colorLi = make("li", [getCSSCls("action-list-item")])
        colorLi.appendChild(document.createTextNode(this.config.defaultItemLable!))
        colorLi.style.fontSize = "12px"
        this.api.listeners.on(colorLi, "click", this.handleColorChange.bind(this, ColorTool.defTokenSymbol.backgroundColors, "backgroundColor", hoist))
        hoist.append(colorLi)
    }
    handleColorChange(color: string, type: "textColor" | "backgroundColor", listEl: HTMLElement, ev?: Event): void {
        this.syncColorActive(listEl, ev)
        this.handleRangeStying(color, type)
    }
    syncColorActive(listEl: HTMLElement, ev?: Event) {
        Array.from(listEl.children).forEach(el => {
            el.classList.remove(getCSSCls("action-list-item--active"))
        })
        const evTarget = ev?.target as HTMLElement
        evTarget.classList.add(getCSSCls("action-list-item--active"))
    }
    handleRangeStying(color: string, type: "textColor" | "backgroundColor") {
        if (!this.range) return;
        if (this.isResetStyling(color, type)) {
            this.handleRangeResetStying(type)
        } else {
            this.handleRangeNormalStying(color, type)
        }
    }
    handleRangeResetStying(type: "textColor" | "backgroundColor") {
        const fathestTokenEl = this.findFathestTokenElement(this.range!)
        if (!fathestTokenEl) {
            const frgs = this.range!.extractContents()
            this.resetFrgsStyling(frgs, type)
            this.range!.insertNode(frgs)
        } else {
            // specail case: selection intersects fathestTokenEl and their contents are same
            if (fathestTokenEl.textContent === this.range!.toString()) {
                this.resetFrgsStyling(fathestTokenEl, type)
                this.resetStyling(type, fathestTokenEl)
            } else {
                if (!this.ifNecessaryApplyStylingReset(type, fathestTokenEl)) return;
                // split range part
                const fathestTokenElCloned_0 = fathestTokenEl.cloneNode(false) as HTMLElement
                const frgs = this.range!.extractContents()
                const emptyNode = make("span", getCSSCls("empty"))
                this.range!.insertNode(emptyNode)
                // preserve previous style
                let pNode = emptyNode.parentNode
                let extractContainer: Node = frgs
                while(pNode && pNode !== fathestTokenEl) {
                    const cloned = pNode.cloneNode(false)
                    cloned.appendChild(extractContainer)
                    extractContainer = cloned
                    pNode = pNode.parentNode
                }
                fathestTokenElCloned_0.appendChild(extractContainer)
                this.resetStyling(type, fathestTokenElCloned_0)
                this.resetFrgsStyling(fathestTokenElCloned_0, type)
                // split former part
                const fathestTokenElPrevNode = fathestTokenEl.previousSibling
                const fathestTokenElCloned_1 = fathestTokenEl.cloneNode(false)
                const range = document.createRange()
                range.setStart(fathestTokenEl, 0)
                range.setEndBefore(emptyNode)
                const prepended = range.extractContents()
                range.detach()
                fathestTokenElCloned_1.appendChild(prepended)
                // mutate dom structrue
                if (fathestTokenElPrevNode) {
                    const frg = document.createDocumentFragment()
                    frg.append(fathestTokenElCloned_1, fathestTokenElCloned_0)
                    fathestTokenElPrevNode.parentElement!.insertBefore(frg, fathestTokenElPrevNode.nextSibling)
                } else {
                    fathestTokenEl.parentElement!.prepend(fathestTokenElCloned_1, fathestTokenElCloned_0)
                }
                // clean up empty node
                let from: Node = emptyNode
                while(from && from !== fathestTokenEl.parentNode) {
                    const pNode = from.parentNode
                    if (isEmptyNode(from)) {
                        pNode!.removeChild(from)
                    }
                    // @ts-ignore                    
                    from = pNode
                }
            }
        }
    }
    handleRangeNormalStying(color: string, type: "textColor" | "backgroundColor") {
        if (this.actionNodes.tokenEl) {
            this.applyStyling(color, type)
            this.processNode(this.actionNodes.tokenEl, color, type)
            return;
        }
        // case 1: selection just includes text node
        if (rangeIsTextNode(this.range!)) {
            const closestTokenEl = this.findClosestTokenElement()
            let betweenNodeCount = 1
            if (this.range!.startContainer !== this.range!.endContainer) {
                betweenNodeCount = 2
                let nextNode = this.range!.startContainer
                while(nextNode && nextNode !== this.range!.endContainer) {
                    betweenNodeCount++;
                    // @ts-ignore
                    nextNode = nextNode.nextSibling
                }
            }
            // if all selection content is included in existed token element, we just modify its style attributes
            if (closestTokenEl) {
                if (closestTokenEl.childNodes.length === betweenNodeCount && closestTokenEl.textContent === this.range!.toString()) {
                    this.applyStyling(color, type, closestTokenEl)
                } else {
                    // TODO: 部分选择时, 选择颜色一致时不额外包裹元素
                    // 临时方案: 目前部分选区也直接用token元素包裹, 这样做即使子范围选择颜色和父级一致也会产生包裹元素, 待后期优化
                    this.wrap(color, type)
                }
            } else {
                this.wrap(color, type)
            }
        } else {
            // case 2: selection includes more than one element
            const surroundedToken = this.isRangeSurroundedByToken()
            this.actionNodes.tokenEl = surroundedToken ?? this.createTokenElement()
            this.applyStyling(color, type)
            const frgs = this.range!.extractContents()
            this.processNode(frgs, color, type)
            this.actionNodes.tokenEl.append(frgs.cloneNode(true))
            if (!surroundedToken) {
                this.range!.insertNode(this.actionNodes.tokenEl)
            }
            this.cleanEmptyBoundaryAndInnerNode(this.actionNodes.tokenEl)
        }
    }
    wrap(color: string, type: "textColor" | "backgroundColor") {
        this.actionNodes.tokenEl = this.createTokenElement()
        this.applyStyling(color, type)
        // or not, we can surround it with token element directly.
        this.range!.surroundContents(this.actionNodes.tokenEl)
        // after surround, the range startContainer and endContainer will be hoisted to surrounded
        // element's parent element, so we should adjust it.
        this.range!.selectNodeContents(this.actionNodes.tokenEl.firstChild!)
    }
    applyStyling(color: string, type: "textColor" | "backgroundColor", el?: HTMLElement) {
        const actionEl = el || this.actionNodes.tokenEl
        if (type === "textColor") {
            actionEl!.style.color = color
        } else if (type === "backgroundColor") {
            actionEl!.style.backgroundColor = color
        }
    }
    processNode(elOrFr: Element | DocumentFragment, color: string, type: "textColor" | "backgroundColor") {
        for (const node of elOrFr.children) {
            if (isEmptyNode(node)) {
                elOrFr.removeChild(node)
                continue;
            }
            if (this.isTokenElement(node)) {
                this.applyStyling(color, type, node as HTMLElement)
            }
            if (node.childElementCount > 0) {
                this.processNode(node, color, type)
            }
        }
    }
    isRangeSurroundedByToken(): HTMLElement | null {
        const closestTokenEl = this.findClosestTokenElement()
        if (closestTokenEl) {
            const range = new Range()
            range.selectNode(closestTokenEl)
            const start = this.range!.compareBoundaryPoints(Range.START_TO_START, range)
            const end = this.range!.compareBoundaryPoints(Range.END_TO_END, range)
            const isSameContent = range.toString() === this.range!.toString()
            range.detach()
            if (start === 1 && end === -1 && isSameContent) {
                return closestTokenEl
            }
        }
        return null
    }
    cleanEmptyBoundaryAndInnerNode(node: Node) {
        if (node.previousSibling && isEmptyNode(node.previousSibling)) {
            node.previousSibling.remove()
        }
        if (node.nextSibling && isEmptyNode(node.nextSibling)) {
            node.nextSibling.remove()
        }
        for (const child of node.childNodes) {
            if (isEmptyNode(child)) {
                node.removeChild(child)
            }
        }
    }
    isResetStyling(color: string, type: "textColor" | "backgroundColor") {
        return (type === "textColor" && color === ColorTool.defTokenSymbol.frontColors)
            || (type === "backgroundColor" && color === ColorTool.defTokenSymbol.backgroundColors)
    }
    resetStyling(type: "textColor" | "backgroundColor", el: HTMLElement) {
        if (type === "textColor") {
            el.style.removeProperty("color")
            return   
        }
        if (type === "backgroundColor") {
            el.style.removeProperty("background-color")
            return   
        }
    }
    findFathestTokenElement(range: Range): HTMLElement | null {
        let node = null
        let from = range.commonAncestorContainer
        while(from && !this.isBlockContainer(from)) {
            if (this.isTokenElement(from)) {
                // @ts-ignore
                node = from
            }
            // @ts-ignore
            from = from.parentElement
        }
        return node
    }
    resetFrgsStyling(elOrFr: Element | DocumentFragment, type: "textColor" | "backgroundColor") {
        for (const node of elOrFr.children) {
            if (isEmptyNode(node)) {
                elOrFr.removeChild(node)
                continue;
            }
            if(this.isTokenElement(node)) {
                this.resetStyling(type, node as HTMLElement)
            }
            if (node.childElementCount > 0) {
                this.resetFrgsStyling(node, type)
            }
        }
    }
    /**
     * for performance, we just do very simple judgement here.
     */
    ifNecessaryApplyStylingReset(type: "textColor" | "backgroundColor", fathestTokenEl: HTMLElement) {
        const property = type === "textColor" ? "color" : "background-color"
        let hasStyling = Boolean(fathestTokenEl.style.getPropertyValue(property))
        if (!hasStyling) {
            if (fathestTokenEl.childElementCount === 0) return false
            // for performance, we just loop children one level.
            for (const node of fathestTokenEl.children) {
                if (this.isTokenElement(node)) {
                    return true
                }
            }
            return false
        }
        return true
    }
}
