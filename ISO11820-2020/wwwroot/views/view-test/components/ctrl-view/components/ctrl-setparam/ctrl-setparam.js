/* 该模块实现试验设备参数设置客户端UI功能 */

//导入全局模块
import { GlobalParam } from "../../../../../../GlobalData.js"

class SetParam extends HTMLElement {
    /* 属性定义 */
    #id = -1;           //对话框ID
    #btnConfirm = null; //提交按钮对象
    #btnClose = null;   //取消按钮对象

    //对话框ViewModel
    #vmSetParam = {
        "innernumber": "",
        "apparatusname": "",
        "checkdatef": "",
        "checkdatet": "",
        "pidport": "",
        "powerport": "",
        "constpower": 0
    };

    constructor(id) {
        super();

        this.#id = id;

        this.render();
    }

    confirmParam(event) {
        //获取用户界面输入
        //...

        //验证输入
        //...

        //上传信息
        let option = {
            method: "PUT",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.#vmSetParam)
        }
        fetch(`api/testmaster/setapparatusparam/${this.#id}`, option)
            .then(response => response.json())
            .then(data => console.log(data));

        //关闭对话框
        this.style.display = 'none';
    }

    closeDialog(event) {
        this.style.display = 'none';
    }

    /*
     * 功能: 初始化视图数据模型(ViewModel)
     */
    initViewModel() {

    }

    /* 重载函数 */
    connectedCallback() {
        if (this.#btnConfirm === null) {
            this.#btnConfirm = document.getElementById(`btnSubmit${this.#id}`);
            this.#btnConfirm.addEventListener('click', this.confirmParam.bind(this));
        }
        if (this.#btnClose === null) {
            this.#btnClose = document.getElementById(`btnCancel${this.#id}`);
            this.#btnClose.addEventListener('click', this.closeDialog.bind(this));
        }
    }

    get template() {
        return `
                <form>
                    <!-- 设备内部编号 -->
                    <label for="txtApparatusNumber">设备编号:</label>
                    <input type="text" name="txtApparatusNumber${this.#id}" id="txtApparatusNumber${this.#id}">
                    <!-- 设备名称 -->
                    <label for="txtApparatusName">设备名称:</label>
                    <input type="text" name="txtApparatusName${this.#id}" id="txtApparatusName${this.#id}">
                    <!-- 检定日期From -->
                    <label for="dtCheckDateF">检定日期:</label>
                    <input type="date" name="dtCheckDateF${this.#id}" id="dtCheckDateF${this.#id}">
                    <!-- 检定日期To -->
                    <label for="dtCheckDateT">至:</label>
                    <input type="date" name="dtCheckDateT${this.#id}" id="dtCheckDateT${this.#id}">
                    <!-- PID控制器端口 -->
                    <label for="txtPidPort">PID端口:</label>
                    <input type="text" name="txtPidPort${this.#id}" id="txtPidPort${this.#id}">
                    <!-- 恒功率控制器端口 -->
                    <label for="txtPowerPort">恒功率端口:</label>
                    <input type="text" name="txtPowerPort${this.#id}" id="txtPowerPort${this.#id}">
                    <!-- 恒功率值 -->
                    <label for="txtConstPower">恒功率值:</label>
                    <input type="text" name="txtConstPower${this.#id}" id="txtConstPower${this.#id}">
                </form>
                <button id="btnSubmit${this.#id}" class="cmdbutton">提交</button>
                <button id="btnCancel${this.#id}" class="cmdbutton">取消</button>
        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('ctrl-setparam', SetParam);

export { SetParam }