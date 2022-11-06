//导入Tab子控件
import { TabbedOutput } from "../output-tabs/output-tabs.js"

class MasterOutput extends HTMLElement {
    /* 属性定义 */
    #outputId;   //该消息输出控件全局ID
    #tabOutput = null; //该消息输出控件包含的Tab显示子控件

    constructor(id) {
        super();

        this.#outputId = id;
        this.#tabOutput = new TabbedOutput(this.#outputId);

        //组装消息输出组件
        this.appendChild(this.#tabOutput);
    }

    getInnerTabCtrl() {
        return this.#tabOutput;
    }

    get template() {
        return `

        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('ctrl-output', MasterOutput);

export { MasterOutput }