/* 该模块定义报表视图组件 */

class ReportView extends HTMLElement {

    constructor() {
        super();

        this.render();
    }

    get template() {
        return `
            <h1>This is report view.</h1>
        `;
    }

    render() {
        this.innerHTML = this.template;
    }
}

customElements.define('view-report', ReportView);

export { ReportView }