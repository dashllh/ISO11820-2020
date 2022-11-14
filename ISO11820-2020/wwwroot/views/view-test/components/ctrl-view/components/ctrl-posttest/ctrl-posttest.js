/* 该组件实现试验结束后录入本次试验现象及试样残余质量的对话框 */

class DlgPostTest extends HTMLElement {
    /* 属性定义 */
    #id = -1;         //对话框ID
    #btnConfirm = null; //确定按钮对象

    #chkFlame = null;    //是否发生火焰
    #txtFlameTime = null; //火焰发生时间文本框对象
    #txtFlameDur  = null;  //火焰持续时间文本框对象
    #txtPostWeight = null;//试样残余质量文本框对象

    //对话框ViewModel
    #vmPostTest = {
        "flame": false,
        "flametime": 0,
        "flamedur": 0,
        "postweight": 0.0
    }

    constructor(id) {
        super();

        this.#id = id;
        this.render();
    }

    confirmPostTest(event) {
        let reg_float = /^[+]?\d+(\.\d+)?$/; //float类型正则表达式Pattern
        let tmpfloat = ""; //用于缓存用户输入的浮点数的临时变量
        //从对话框获取用户输入
        if (this.#chkFlame.checked) {
            this.#vmPostTest.flame = true;
            //起火时间
            tmpfloat = document.getElementById(`flametime${this.#id}`).value;            
            if (!reg_float.test(tmpfloat)) {
                document.getElementById(`flametime${this.#id}`).focus();
                return;
            } else {
                this.#vmPostTest.flametime = parseFloat(tmpfloat);
            }
            //火焰持续时间
            tmpfloat = document.getElementById(`flamedur${this.#id}`).value;            
            if (!reg_float.test(tmpfloat)) {
                document.getElementById(`flamedur${this.#id}`).focus();
                return;
            } else {
                this.#vmPostTest.flamedur = parseFloat(tmpfloat);
            }
        } else {
            this.#vmPostTest.flame = false;
        }       
        //试样残余质量
        tmpfloat = this.#txtPostWeight.value;        
        if (!reg_float.test(tmpfloat)) {
            this.#txtPostWeight.focus();
            return;
        } else {
            this.#vmPostTest.postweight = parseFloat(tmpfloat);
        }
        //上传信息
        let option = {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(this.#vmPostTest)
        }
        fetch(`api/testmaster/setpostdata/${this.#id}`, option)
            .then(response => response.json())
            .then(data => console.log(data));
        //关闭对话框
        this.style.display = 'none';
    }

    /* 控件事件监听器 */
    onFlameEventCheck(event) {
        this.#txtFlameTime.disabled = this.#chkFlame.checked ? false : true;
        this.#txtFlameDur.disabled = this.#chkFlame.checked ? false : true;
        console.log(this.#txtFlameTime.disabled);
    }

    connectedCallback() {
        /* 初始化控件对象并注册按钮事件 */
        //确定按钮
        if (this.#btnConfirm === null) {
            this.#btnConfirm = document.getElementById(`btnConfirmPostTest${this.#id}`);
            this.#btnConfirm.addEventListener('click', this.confirmPostTest.bind(this));
        }
        //起火时间  
        if (this.#txtFlameTime === null) {
            this.#txtFlameTime = document.getElementById(`flametime${this.#id}`);
        }
        //火焰持续时间
        if (this.#txtFlameDur === null) {
            this.#txtFlameDur = document.getElementById(`flamedur${this.#id}`);
        }
        //是否发生持续火焰
        if (this.#chkFlame === null) {
            this.#chkFlame = document.getElementById(`chkflame${this.#id}`);
            this.#chkFlame.addEventListener('change', this.onFlameEventCheck.bind(this));
        }
        //试样残余质量
        if (this.#txtPostWeight === null) {
            this.#txtPostWeight = document.getElementById(`postweight${this.#id}`);
        }
    }

    get template() {
        return `
                <!-- 试验完成后信息录入对话框 -->
                <form id="formPostTest${this.#id}" class="dlgposttest">
                    <!-- 试验现象 -->
                    <fieldset class="testpheno">
                        <legend>
                            <input type="checkbox" name="chkflame${this.#id}" id="chkflame${this.#id}">
                            <label for="chkflame${this.#id}">持续火焰</label>
                        </legend>
                        <label for="flametime${this.#id}">发生时间(s):</label>
                        <input type="text" name="flametime${this.#id}" id="flametime${this.#id}" disabled />
                        <br>
                        <label for="flamedur${this.#id}">持续时间(s):</label>
                        <input type="text" name="flamedur${this.#id}" id="flamedur${this.#id}" disabled />
                    </fieldset>
                <!-- 试样残余质量 -->
                    <fieldset class="weightinfo">
                        <legend>试样质量</legend>
                        <label for="postweight${this.#id}">残余质量(g):</label>
                        <input type="text" name="postweight${this.#id}" id="postweight${this.#id}" value="0">
                    </fieldset>

                    <input type="button" id="btnConfirmPostTest${this.#id}" class="posttestbutton" value="确定">
                </form>
               `;
    }

    render() {
        this.innerHTML = this.template;
    }
}


customElements.define('ctrl-posttest', DlgPostTest);

export { DlgPostTest }