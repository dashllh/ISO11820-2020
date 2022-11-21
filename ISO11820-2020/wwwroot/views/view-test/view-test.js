// 导入控制器视图组件
import { CtrlView } from "./components/ctrl-view/ctrl-view.js"

class TestView extends HTMLElement {
    /* 属性定义 */
    #ctrlViews = [];  //四个试验控制面板

    constructor() {
        super();

        //创建并添加四个视图对象,同时设置相应的布局位置
        for (let i = 0; i < 4; i++) {
            this.#ctrlViews.push(new CtrlView(i));
            this.#ctrlViews[i].classList.add(`ctrl-view${i}`);
            this.appendChild(this.#ctrlViews[i]);
        }
    }

    /*
        功能: 更新视图显示数据(只处理试验控制器返回的消息)
        参数:
             model:JSON - 要更新显示的数据对象
    */
    updateView(model) {
        this.#ctrlViews[model.MasterId].updateDisplay(model);       
    }

    /*
     * 功能: 处理服务器端Action API的返回消息
     * 参数:
     *       msg:JSON - 服务器端Action API的返回消息
     */
    parseControllerMsg(msg) {
        this.#ctrlViews[msg.param.masterid].handleControllerMsg(msg);
    }
}

customElements.define('view-test', TestView);

export { TestView }