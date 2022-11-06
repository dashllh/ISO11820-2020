//导入控制器消息显示子控件
import { MasterMsg } from "../ctrl-msg/ctrl-msg.js"
//导入传感器历史数据显示子控件
import { SensorDataList } from "../ctrl-sensordata/ctrl-sensordata.js"

class TabbedOutput extends HTMLElement {
    /* 属性定义 */
    #tabId;  //该Tab控件全局ID
    #objMsgList = null;  //消息组件
    #objDataList = null; //传感器历史数据组件

    constructor(id) {
        super();

        this.#tabId = id;
        //创建子控件
        this.#objMsgList = new MasterMsg(this.#tabId);
        this.#objDataList = new SensorDataList(this.#tabId);

        //组装子组件
        this.render();
        this.appendChild(this.#objMsgList);
        this.appendChild(this.#objDataList);

        //测试代码:动态创建控件ID属性
        var attrId = document.createAttribute("id");
        attrId.value = `_idTabbedOutput${this.#tabId}`;
        this.setAttributeNode(attrId);
    }

    getMsgList() {
        return this.#objMsgList;
    }

    getDataList() {
        return this.#objDataList;
    }

    get template() {
        return `
            <input type="radio" name="masteroutput${this.#tabId}" id="_idMasterMsgOutput${this.#tabId}" checked>
            <label for="_idMasterMsgOutput${this.#tabId}">系统消息</label>
            <input type="radio" name="masteroutput${this.#tabId}" id="_idSensoDataOutput${this.#tabId}">
            <label for="_idSensoDataOutput${this.#tabId}">历史数据</label>
        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('tabbed-output', TabbedOutput);

export { TabbedOutput }