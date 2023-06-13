/* 模块功能:
 *          实时数据项显示组件
 * 包含属性：
 *          1.label:string - 数据项目名称
 *          2.value:float  - 数据实时值
 * 控制参数:
 *          1.round:string - 保留小数点后数据位数
 *          
 * 修改日期: 2023-6-12
 * 
 * 修改履历:
 *          1. 将属性接口Value修改为value以匹配数据模型绑定方法中对.value的统一访问
 *  
 */

class RealTimeItem extends HTMLElement {
    //属性定义
    #label = 'name';  //数据名称
    #value = 888.8;   //当前数据值
    #round = 0;       //保留小数位数
    #unit = "";       //物理量单位 

    constructor(label, round, unit) {
        super();

        this.#label = label;
        this.#round = round;
        this.#unit = unit;
    }

    //getter setter
    set Label(data) {
        this.#label = data;
        this.render();
    }

    get Label() {
        return this.#label;
    }

    set value(data) {
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

    get value() {
        return this.#value;
    }

    set Round(data) {
        this.#round = data;
    }

    get Round() {
        return this.#round;
    }

    set Unit(data) {
        this.#unit = data;
        this.render();
    }

    get Unit() {
        return this.#unit;
    }

    static get observedAttributes() {
        return ['label', 'round', 'value', 'unit']
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
            case 'value':
                this.Value = newvalue;
                break;
            case 'unit':
                this.Unit = newvalue;
                break;
        }
    }

    connectedCallback() {

    }

    disconnectedCallback() {

    }

    // 组件样式
    get style() {

    }

    //组件HTML模板
    get template() {
        return `            
            <div class="rt-item">
                <div class="header">
                    ${this.#label} ${this.#unit}
                </div>
                <div class="value">
                    ${this.#value}
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