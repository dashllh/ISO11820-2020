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
        let reg_int = /^[+]?\d+$/;  //正整数正则表达式
        let iTmpPower;  //用于存储待验证的恒功率值变量
        //获取用户界面输入
        this.#vmSetParam.innernumber   = document.getElementById(`txtApparatusNumber${this.#id}`).value;
        this.#vmSetParam.apparatusname = document.getElementById(`txtApparatusName${this.#id}`).value;
        this.#vmSetParam.checkdatef    = document.getElementById(`dtCheckDateF${this.#id}`).value;
        this.#vmSetParam.checkdatet    = document.getElementById(`dtCheckDateT${this.#id}`).value;
        this.#vmSetParam.pidport       = document.getElementById(`txtPidPort${this.#id}`).value;
        this.#vmSetParam.powerport     = document.getElementById(`txtPowerPort${this.#id}`).value;        
        //验证输入
        iTmpPower = document.getElementById(`txtConstPower${this.#id}`).value;
        if (!reg_int.test(iTmpPower)) {
            document.getElementById(`txtConstPower${this.#id}`).focus();
            return;
        } else {
            this.#vmSetParam.constpower = parseInt(iTmpPower);
        }

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
            .then(data => {
                //更新成功,同步更新客户端全局设备数据
                if (data.ret === '0') {
                    GlobalParam.TestMasters[this.#id].InnerNumber = this.#vmSetParam.innernumber;
                    GlobalParam.TestMasters[this.#id].Name = this.#vmSetParam.apparatusname;
                    GlobalParam.TestMasters[this.#id].CheckDateF = this.#vmSetParam.checkdatef;
                    GlobalParam.TestMasters[this.#id].CheckDateT = this.#vmSetParam.checkdatet;
                    GlobalParam.TestMasters[this.#id].PidPort = this.#vmSetParam.pidport;
                    GlobalParam.TestMasters[this.#id].PowerPort = this.#vmSetParam.powerport;
                    GlobalParam.TestMasters[this.#id].ConstPower = this.#vmSetParam.constpower;
                }
            });
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
        document.getElementById(`txtApparatusNumber${this.#id}`).value = GlobalParam.TestMasters[this.#id].InnerNumber;
        document.getElementById(`txtApparatusName${this.#id}`).value   = GlobalParam.TestMasters[this.#id].Name;
        document.getElementById(`dtCheckDateF${this.#id}`).value       = GlobalParam.TestMasters[this.#id].CheckDateF;
        document.getElementById(`dtCheckDateT${this.#id}`).value       = GlobalParam.TestMasters[this.#id].CheckDateT;
        document.getElementById(`txtPidPort${this.#id}`).value         = GlobalParam.TestMasters[this.#id].PidPort;
        document.getElementById(`txtPowerPort${this.#id}`).value       = GlobalParam.TestMasters[this.#id].PowerPort;
        document.getElementById(`txtConstPower${this.#id}`).value      = GlobalParam.TestMasters[this.#id].ConstPower;


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