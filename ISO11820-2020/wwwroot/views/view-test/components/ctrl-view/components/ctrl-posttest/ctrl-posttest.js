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
        "flametime": -1,
        "flamedur": -1,
        "postweight": -1
    }

    constructor(id) {
        super();

        this.#id = id;
        this.render();
    }

    confirmPostTest(event) {
        this.style.display = 'none';
    }

    connectedCallback() {
        /* 注册按钮事件 */
        //确定
        if (this.#btnConfirm === null) {
            this.#btnConfirm = document.getElementById(`btnConfirmPostTest${this.#id}`);
            this.#btnConfirm.addEventListener('click', this.confirmPostTest.bind(this));
        }

        if (this.#chkFlame === null) {
            this.#chkFlame = document.getElementById(`chkflame${this.#id}`);
        }
        if (this.#txtFlameTime === null) {
            this.#txtFlameTime = document.getElementById(`flametime${this.#id}`);
        }
        if (this.#txtFlameDur === null) {
            this.#txtFlameDur = document.getElementById(`flamedur${this.#id}`);
        }
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
                        <legend>试验现象</legend>
                        <input type="checkbox" name="chkflame${this.#id}" id="chkflame${this.#id}">
                        <label for="chkflame${this.#id}">持续火焰</label>
                        <br>
                        <label for="flametime${this.#id}">发生时间(s):</label>
                        <input type="text" name="flametime${this.#id}" id="flametime${this.#id}">
                        <br>
                        <label for="flamedur${this.#id}">持续时间(s):</label>
                        <input type="text" name="flamedur${this.#id}" id="flamedur${this.#id}">
                    </fieldset>
                <!-- 试样残余质量 -->
                    <fieldset class="weightinfo">
                        <legend>质量信息</legend>
                        <label for="postweight${this.#id}">试样残余质量(g):</label>
                        <input type="text" name="postweight${this.#id}" id="postweight${this.#id}">
                    </fieldset>

                    <input type="button" id="btnConfirmPostTest${this.#id}" value="确定">
                </form>
               `;
    }

    render() {
        this.innerHTML = this.template;
    }
}


customElements.define('ctrl-posttest', DlgPostTest);

export { DlgPostTest }