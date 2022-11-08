/* 该组件封装客户端控制器温度图表控件(Echarts) */
class TempChart extends HTMLElement {
    /* 属性定义 */
    #chartId = 0;  //图表控件全局ID
    #chartObj = null; //chart实体对象

    //温度数据缓存(初始放入原点坐标以使图表正确显示)
    #temp1Buf = [[0, 0]];
    #temp2Buf = [[0, 0]];
    #tempSufBuf = [[0, 0]];
    #tempCenBuf = [[0, 0]];
    //#temp1Buf = [];
    //#temp2Buf = [];
    //#tempSufBuf = [];
    //#tempCenBuf = [];

    //图表配置属性
    #option = {
        title: {
            show: false
        },
        grid: {
            left: 65,
            top: '10%',
            right: 40,
            bottom: '12%'
        },
        xAxis: {
            type: "value",
            max: 1800,
            splitLine: {
                show: true
            }
        },
        yAxis: {
            name: "实时温度(℃)",
            nameTextStyle: {
                width: 25,
                fontSize: 14,
                padding: 20
            },
            type: "value",
            max: 1000,
            boundaryGap: [0, "30%"],
            nameLocation: "middle",
            splitLine: {
                show: true                
            }
        }
    };

    /*
        功能: 构造函数
        参数:
              id:number - 图表控件全局ID
    */
    constructor(id) {
        super();

        this.#chartId = id;
        this.render();
    }

    /* 回调函数 */
    connectedCallback() {
        if (this.#chartObj === null) {
            const chartDom = document.getElementById(`_idChart${this.#chartId}`);
            //初始化图表对象
            this.#chartObj = echarts.init(chartDom);
            //设置图表显示参数
            this.#chartObj.setOption(this.#option);
            this.#chartObj.setOption({
                series: [
                    {
                        type: 'line',
                        showSymbol: false,
                        data: this.#temp1Buf,
                        lineStyle: {
                            width: 1
                        }
                    },
                    {
                        type: 'line',
                        showSymbol: false,
                        data: this.#temp2Buf,
                        lineStyle: {
                            width: 1
                        }
                    },
                    {
                        type: 'line',
                        showSymbol: false,
                        data: this.#tempSufBuf,
                        lineStyle: {
                            width: 1
                        }
                    },
                    {
                        type: 'line',
                        showSymbol: false,
                        data: this.#tempCenBuf,
                        lineStyle: {
                            width: 1
                        }
                    }
                ]
            });
            this.#temp1Buf = [];
            this.#temp2Buf = [];
            this.#tempSufBuf = [];
            this.#tempCenBuf = [];
            this.#temp1Buf.length = 0;
            this.#temp2Buf.length = 0;
            this.#tempSufBuf.length = 0;
            this.#tempCenBuf.length = 0;
            //注册窗体大小改变回调函数,实现响应式效果
            // window.onresize = OnWindowResize(this.#chartObj);
        }
    }

    disconnectedCallback() {
        //释放chart实体对象内存资源
        // this.#chartObj.dispose();
        // this.#chartObj = null;
    }

    /* 接口方法 */

    /*
        功能: 刷新图表显示
        参数:
            timer - 试验计时
            temp1 - 炉内温度1
            temp2 - 炉内温度2
            tempSuf - 表面温度
            tempCen - 中心温度
    */
    refresh(timer,temp1,temp2,tempSuf,tempCen) {
        this.#temp1Buf.push([timer,temp1]);
        this.#temp2Buf.push([timer,temp2]);
        this.#tempSufBuf.push([timer,tempSuf]);
        this.#tempCenBuf.push([timer, tempCen]);
        //如果计时器超过1800秒,2400秒,3000秒,则扩展X轴显示
        if (timer === 1800 || timer === 2400 || timer === 3600) {
            this.#chartObj.setOption({
                xAxis: {
                    type: "value",
                    max: timer + 600,
                    splitLine: {
                        show: true
                    }
                }
            });            
        }
        ////如果计时器超过2400秒,则扩展X轴显示
        //if (timer === 2400) {
        //    this.#chartObj.setOption({
        //        xAxis: {
        //            type: "value",
        //            max: 3000,
        //            splitLine: {
        //                show: true
        //            }
        //        }
        //    });
        //}
        ////如果计时器超过3000秒,则扩展X轴显示
        //if (timer === 3000) {
        //    this.#chartObj.setOption({
        //        xAxis: {
        //            type: "value",
        //            max: 3600,
        //            splitLine: {
        //                show: true
        //            }
        //        }
        //    });
        //}
        this.#chartObj.setOption({
            series: [
                {
                    data: this.#temp1Buf
                },
                {
                    data: this.#temp2Buf
                },
                {
                    data: this.#tempSufBuf
                },
                {
                    data: this.#tempCenBuf
                }
            ]
        });
    }

    /*
     *  功能: 清空曲线图表显示
     */
    resetChart() {
        this.#temp1Buf = [[0, 0]];
        this.#temp2Buf = [[0, 0]];
        this.#tempSufBuf = [[0, 0]];
        this.#tempCenBuf = [[0, 0]];
        this.#chartObj.setOption({
            series: [
                {
                    data: this.#temp1Buf
                },
                {
                    data: this.#temp2Buf
                },
                {
                    data: this.#tempSufBuf
                },
                {
                    data: this.#tempCenBuf
                }
            ]
        });
        this.#temp1Buf = [];
        this.#temp2Buf = [];
        this.#tempSufBuf = [];
        this.#tempCenBuf = [];
        this.#temp1Buf.length = 0;
        this.#temp2Buf.length = 0;
        this.#tempSufBuf.length = 0;
        this.#tempCenBuf.length = 0;
    }

    get template() {
        return `
            <div id="_idChart${this.#chartId}" style="width: 730px;height: 210px;"></div>
        `;
    }

    render() {
        this.innerHTML = this.template;
    }

}

function OnWindowResize(chartObj) {
    chartObj.resize();
}

customElements.define('ctrl-chart', TempChart);

export { TempChart }