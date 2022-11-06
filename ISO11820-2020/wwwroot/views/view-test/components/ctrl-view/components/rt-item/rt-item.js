/* 模块功能:
 *          实时数据项显示组件
 * 包含属性：
 *          1.label - 数据项目名称
 *          2.value - 数据实时值
 * 控制参数:
 *          1.round - 保留小数点后数据位数
 *          
 * 修改日期: 2022-8-25
 * */

class RealTimeItem extends HTMLElement {
    //属性定义
    #label = 'name';  //数据名称
    #value = 888.8;       //当前数据值
    #round = 0;       //保留小数位数

    constructor(label,round) {
        super();

        this.#label = label;
        this.#round = round;

        this.render();
    }

    //getter setter
    set Label(data) {
        this.#label = data;
    }

    get Label() {
        return this.#label;
    }

    set Value(data) {
        switch (this.#round) {
            case '0':
                this.#value = Math.round(data);
                break;
            case '1':
                this.#value = Math.round((data + Number.EPSILON) * 10) / 10;
                break;
            case '2':
                this.#value = Math.round((data + Number.EPSILON) * 100) / 100;
                break;
            case '3':
                this.#value = Math.round((data + Number.EPSILON) * 1000) / 1000;
                break;
        }
        this.render();        
    }

    get Value() {
        return this.#value;
    }

    set Round(data) {
        this.#round = data;
    }

    get Round() {
        return this.#round;
    }

    static get observedAttributes() {
        return ['label','round']
    }

    //回调函数
    attributeChangedCallback(item, oldvalue, newvalue) {
        switch (item) {
            case 'label':
                this.Label = newvalue;
                break;
            case 'round':
                this.Round = newvalue;
                break;
        }
    }

    connectedCallback() {
        
    }

    disconnectedCallback() {

    }

    //组件HTML模板
    get template() {
        return `            
            <div class="rt-item">
                <div class="header">
                    ${this.Label}
                </div>
                <div class="value">
                    ${this.Value}
                </div>
            </div>
        `;
    }

    //渲染函数
    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('rt-item', RealTimeItem);

export { RealTimeItem }