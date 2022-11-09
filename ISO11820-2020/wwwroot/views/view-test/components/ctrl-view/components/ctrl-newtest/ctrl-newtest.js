/* 该模块定义新建试验客户端组件(类似对话框) */

//导入全局模块
import { GlobalParam } from "../../../../../../GlobalData.js"

class NewTest extends HTMLElement {
    /* 属性定义 */
    #id = -1;         //对话框ID
    #btnConfirm = null;
    #btnClose = null;
    #txtSmpSubId = null;
    #txtTestId = null;

    //对话框ViewModel
    #vmNewTest = {
            "AmbTemp": 0,
            "AmbHumi": 0,
            "SmpId": "",
            "SmpSubId": "",
            "SmpName": "",
            "SmpSpec": "",
            "SmpHeight": 0,
            "SmpDiameter": 0,
            "SmpWeight": 0,
            "TestId": "",
            "TestDate": "",
            "TestAccord": "",
            "Operator": "",
            "ApparatusId": "",
            "ApparatusName": "",
            "ApparatusChkDate": "",
            "ConstPower": 0,
            "Memo":""
    };

    constructor(id) {
        super();

        this.#id = id;

        this.render();
    }

    initViewModel() {
        this.#vmNewTest.AmbTemp     = 23;
        this.#vmNewTest.AmbHumi     = 55;
        this.#vmNewTest.SmpId       = "";
        this.#vmNewTest.SmpSubId    = ""; 
        this.#vmNewTest.SmpName     = "";
        this.#vmNewTest.SmpSpec     = ""; 
        this.#vmNewTest.SmpHeight   = ""; 
        this.#vmNewTest.SmpDiameter = "";
        this.#vmNewTest.SmpWeight   = "";
        this.#vmNewTest.TestId      = "";
        this.#vmNewTest.Memo        = "";

        var curDate = new Date();
        this.#vmNewTest.TestDate         = curDate.getFullYear() + "/" + (curDate.getMonth() + 1) + "/" + curDate.getDate();
        this.#vmNewTest.TestAccord       = "ISO11820-2020";
        this.#vmNewTest.Operator         = GlobalParam.LoginUser;
        this.#vmNewTest.ApparatusId      = GlobalParam.TestMasters[this.#id].Id;
        this.#vmNewTest.ApparatusName    = GlobalParam.TestMasters[this.#id].Name;
        this.#vmNewTest.ApparatusChkDate = GlobalParam.TestMasters[this.#id].CheckDate;
        this.#vmNewTest.ConstPower       = GlobalParam.TestMasters[this.#id].ConstPower;

        document.getElementById(`ambtemp${this.#id}`).value     = this.#vmNewTest.AmbTemp    ;
        document.getElementById(`ambhumi${this.#id}`).value     = this.#vmNewTest.AmbHumi    ;
        document.getElementById(`smpid${this.#id}`).value       = this.#vmNewTest.SmpId      ;
        document.getElementById(`smpsubid${this.#id}`).value    = this.#vmNewTest.SmpSubId   ;
        document.getElementById(`smpname${this.#id}`).value     = this.#vmNewTest.SmpName    ;
        document.getElementById(`smpspec${this.#id}`).value     = this.#vmNewTest.SmpSpec    ;
        document.getElementById(`smpheight${this.#id}`).value   = this.#vmNewTest.SmpHeight  ;
        document.getElementById(`smpdiameter${this.#id}`).value = this.#vmNewTest.SmpDiameter;
        document.getElementById(`smpweight${this.#id}`).value   = this.#vmNewTest.SmpWeight  ;
        document.getElementById(`testid${this.#id}`).value      = this.#vmNewTest.TestId;

        document.getElementById(`testdate${this.#id}`).value         = this.#vmNewTest.TestDate        ;
        document.getElementById(`testaccord${this.#id}`).value       = this.#vmNewTest.TestAccord      ;
        document.getElementById(`testoperator${this.#id}`).value     = this.#vmNewTest.Operator        ;
        document.getElementById(`apparatusid${this.#id}`).value      = this.#vmNewTest.ApparatusId     ;
        document.getElementById(`apparatusname${this.#id}`).value    = this.#vmNewTest.ApparatusName   ;
        document.getElementById(`apparatuschkdate${this.#id}`).value = this.#vmNewTest.ApparatusChkDate;
        document.getElementById(`constpower${this.#id}`).value       = this.#vmNewTest.ConstPower;
        document.getElementById(`testmemo${this.#id}`).value         = this.#vmNewTest.Memo;
    }

    /* 提交新试验数据至试验控制器 */
    confirmNewTest(event) {
        //浮点数正则表达式Pattern
        let reg_float = /^[+]?\d+(\.\d+)?$/; //float类型正则表达式Pattern
        let tmpfloat = ""; //用于缓存用户输入的浮点数的临时变量
        /* 确认输入信息并上传试验控制器 */
        //获取输入信息
        this.#vmNewTest.AmbTemp = document.getElementById(`ambtemp${this.#id}`).value;
        this.#vmNewTest.AmbHumi = document.getElementById(`ambhumi${this.#id}`).value;
        this.#vmNewTest.SmpId = document.getElementById(`smpid${this.#id}`).value;
        this.#vmNewTest.SmpSubId = document.getElementById(`smpsubid${this.#id}`).value;
        this.#vmNewTest.SmpName = document.getElementById(`smpname${this.#id}`).value;
        this.#vmNewTest.SmpSpec = document.getElementById(`smpspec${this.#id}`).value;
        //试样高度
        tmpfloat = document.getElementById(`smpheight${this.#id}`).value;        
        if (!reg_float.test(tmpfloat)) {
            document.getElementById(`smpheight${this.#id}`).focus();
            return;
        } else {
            this.#vmNewTest.SmpHeight = parseFloat(tmpfloat);
        }
        //试样直径
        tmpfloat = document.getElementById(`smpdiameter${this.#id}`).value;        
        if (!reg_float.test(tmpfloat)) {
            document.getElementById(`smpdiameter${this.#id}`).focus();
            return;
        } else {
            this.#vmNewTest.SmpDiameter = parseFloat(tmpfloat);
        }
        //样品质量
        tmpfloat = document.getElementById(`smpweight${this.#id}`).value;        
        if (!reg_float.test(tmpfloat)) {
            document.getElementById(`smpweight${this.#id}`).focus();
            return;
        } else {
            this.#vmNewTest.SmpWeight = parseFloat(tmpfloat);
        }
        //试验编号
        this.#vmNewTest.TestId = document.getElementById(`testid${this.#id}`).value;
        //试验日期
        var curDate = new Date();
        document.getElementById(`testdate${this.#id}`).value = curDate.getFullYear() + "/" + (curDate.getMonth()+1) + "/" + curDate.getDate();
        this.#vmNewTest.TestDate = document.getElementById(`testdate${this.#id}`).value;
        this.#vmNewTest.TestAccord = document.getElementById(`testaccord${this.#id}`).value;
        this.#vmNewTest.Operator = document.getElementById(`testoperator${this.#id}`).value;
        this.#vmNewTest.ApparatusId = document.getElementById(`apparatusid${this.#id}`).value;
        this.#vmNewTest.ApparatusName = document.getElementById(`apparatusname${this.#id}`).value;
        this.#vmNewTest.ApparatusChkDate = document.getElementById(`apparatuschkdate${this.#id}`).value;
        this.#vmNewTest.ConstPower = document.getElementById(`constpower${this.#id}`).value;
        this.#vmNewTest.Memo = document.getElementById(`testmemo${this.#id}`).value;

        console.log(this.#vmNewTest);
        //验证信息完整新与合法性
        //...

        //上传信息
        let option = {
            method: "POST",
            headers: {
                'Content-Type':'application/json'
            },
            body: JSON.stringify(this.#vmNewTest)
        }
        fetch(`api/testmaster/newtest/${this.#id}`, option)
            .then(response => response.json())
            .then(data => console.log(data));

        //关闭对话框
        this.style.display = 'none';
    }

    closeDialog(event) {
        this.style.display = 'none';
    }

    connectedCallback() {
        /* 注册按钮事件 */
        //确定
        if (this.#btnConfirm === null) {
            this.#btnConfirm = document.getElementById(`btnCreateNewTest${this.#id}`);
            this.#btnConfirm.addEventListener('click', this.confirmNewTest.bind(this));
        }
        //取消
        if (this.#btnClose === null) {
            this.#btnClose = document.getElementById(`btnCancelNewTest${this.#id}`);
            this.#btnClose.addEventListener('click', this.closeDialog.bind(this));
        }
        /* 注册输入框联动事件 */
        //样品标识号 -> 试验编号
        if (this.#txtTestId === null) {
            this.#txtTestId = document.getElementById(`testid${this.#id}`);
        }
        if (this.#txtSmpSubId === null) {
            this.#txtSmpSubId = document.getElementById(`smpsubid${this.#id}`);
            this.#txtSmpSubId.addEventListener('input', (event) => {
                this.#txtTestId.value = this.#txtSmpSubId.value;
            });            
        }        
    }

    get template() {
        return `
            <!-- 新建试验对话框 -->
            <form id="formNewTest${this.#id}" class="newtest">
                <!-- 环境信息 -->
                <fieldset class="ambinfo">
                    <legend>环境信息</legend>
                    <label for="ambtemp${this.#id}" class="data-label">环境温度:</label>
                    <input type="text" class="ambtemp" name="ambtemp${this.#id}" id="ambtemp${this.#id}">
                    <label for="ambtemp${this.#id}" class="lblambtemp">℃</label>
                    <label for="ambhumi${this.#id}" class="data-label lbl-ambhumi">环境湿度:</label>
                    <input type="text" class="ambhumi" name="ambhumi${this.#id}" id="ambhumi${this.#id}">
                    <label for="ambhumi${this.#id}">%</label>
                </fieldset>
                <!-- 试样信息 -->
                <fieldset class="smpinfo">
                    <legend>试样信息</legend>
                    <label for="smpid${this.#id}" class="data-label">试样编号:</label>
                    <input type="text" class="smpid" name="smpid${this.#id}" id="smpid${this.#id}">
                    <label for="smpsubid${this.#id}" class="data-label lbl-smpsubid">样品标识号:</label>
                    <input type="text" class="smpsubid" name="smpsubid${this.#id}" id="smpsubid${this.#id}">
                    <br>
                    <label for="smpname${this.#id}" class="data-label">产品名称:</label>
                    <input type="text" class="smpname" name="smpname${this.#id}" id="smpname${this.#id}">
                    <br>
                    <label for="smpspec${this.#id}" class="data-label">规格型号:</label>
                    <input type="text" class="smpspec" name="smpspec${this.#id}" id="smpspec${this.#id}">
                    <br>
                    <label for="smpheight${this.#id}" class="data-label lbl-smpheight">高度:</label>
                    <input type="text" class="smpheight" name="smpheight${this.#id}" id="smpheight${this.#id}">
                    <label for="smpheight${this.#id}">mm</label>
                    <label for="smpdiameter${this.#id}" class="data-label">直径:</label>
                    <input type="text" class="smpdiameter" name="smpdiameter${this.#id}" id="smpdiameter${this.#id}">
                    <label for="smpdiameter${this.#id}">mm</label>
                    <label for="smpweight${this.#id}" class="data-label">质量:</label>
                    <input type="text" class="smpweight" name="smpweight${this.#id}" id="smpweight${this.#id}">
                    <label for="smpweight${this.#id}">g</label>
                </fieldset>
                <!-- 试验信息 -->
                <fieldset class="testinfo">
                    <legend>试验信息</legend>
                    <label for="testid${this.#id}" class="data-label">试验编号:</label>
                    <input type="text" name="testid${this.#id}" id="testid${this.#id}">
                    <label for="testdate${this.#id}" class="data-label">试验日期:</label>
                    <input type="text" name="testdate${this.#id}" id="testdate${this.#id}">
                    <label for="testaccord${this.#id}" class="data-label">检验依据:</label>
                    <input type="text" name="testaccord${this.#id}" id="testaccord${this.#id}">
                    <label for="testoperator${this.#id}" class="data-label">试验人员:</label>
                    <input type="text" name="testoperator${this.#id}" id="testoperator${this.#id}">
                </fieldset>
                <!-- 设备信息 -->
                <fieldset class="apparatusinfo">
                    <legend>设备信息</legend>
                    <label for="apparatusid${this.#id}" class="data-label">设备编号:</label>
                    <input type="text" name="apparatusid${this.#id}" id="apparatusid${this.#id}">
                    <label for="apparatusname${this.#id}" class="data-label">设备名称:</label>
                    <input type="text" name="apparatusname${this.#id}" id="apparatusname${this.#id}">
                    <label for="apparatuschkdate${this.#id}" class="data-label">检定日期:</label>
                    <input type="text" name="apparatuschkdate${this.#id}" id="apparatuschkdate${this.#id}">
                    <label for="constpower${this.#id}" class="data-label">恒功率值:</label>
                    <input type="text" name="constpower${this.#id}" id="constpower${this.#id}">
                </fieldset>
                <!-- 其他信息 -->
                <fieldset class="otherinfo">
                    <legend>其他信息</legend>
                    <label for="testmemo${this.#id}" class="data-label">试验备注:</label>
                    <input type="text" class="testmemo" name="testmemo${this.#id}" id="testmemo${this.#id}">
                </fieldset>
            </form>
            <!-- 功能按钮 -->
            <input type="button" id="btnCreateNewTest${this.#id}" class="cmdbutton" value="确定">
            <input type="button" id="btnCancelNewTest${this.#id}" class="cmdbutton" value="取消">
        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('ctrl-newtest', NewTest);

export { NewTest }