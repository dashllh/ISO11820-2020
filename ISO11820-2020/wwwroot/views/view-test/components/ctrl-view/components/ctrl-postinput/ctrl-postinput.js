/* 该模块定义试验结束后需要试验人员立即输入的补充数据(比如:试样残余质量等) */

class PostInput extends HTMLElement {

    constructor() {
        super();
    }

    get template() {
        return `

        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('ctrl-postinput', PostInput);

export { PostInput }