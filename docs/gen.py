def gen_svg(out, window):
    a_x = 180
    b_x = 280
    line_height = 600
    station_height = line_height + 20
    anno_width = 20
    text_padding = 5

    with open(out, "w") as f:

        def add_annotation(y, text, station):
            if station == "A":
                x = a_x
                print(
                    f'<text x="{a_x - anno_width / 2 - text_padding}" y="{y}" text-anchor="end" dominant-baseline="middle">{text}</text>',
                    file=f,
                )
            elif station == "B":
                x = b_x
                print(
                    f'<text x="{b_x + anno_width / 2 + text_padding}" y="{y}" text-anchor="start" dominant-baseline="middle">{text}</text>',
                    file=f,
                )
            else:
                assert False
            print(
                f'<line x1="{x - anno_width / 2}" y1="{y}" x2="{x + anno_width / 2}" y2="{y}" stroke="black" />',
                file=f,
            )

        def add_range(y1, y2, text, station):
            if station == "A":
                print(
                    f'<text x="{a_x - anno_width / 2 - text_padding}" y="{(y1 + y2) / 2}" text-anchor="end" dominant-baseline="middle">{text}</text>',
                    file=f,
                )
                print(
                    f'<text x="0" y="0" transform="translate({a_x - 2}, {(y1 + y2) / 2}),scale(1, {(y2 - y1) / 15})" text-anchor="end" dominant-baseline="middle">{{</text>',
                    file=f,
                )
            elif station == "B":
                print(
                    f'<text x="{b_x + anno_width / 2 + text_padding}" y="{(y1 + y2) / 2}" text-anchor="start" dominant-baseline="middle">{text}</text>',
                    file=f,
                )
                print(
                    f'<text x="0" y="0" transform="translate({b_x + 2}, {(y1 + y2) / 2}),scale(1, {(y2 - y1) / 15})" text-anchor="start" dominant-baseline="middle">}}</text>',
                    file=f,
                )
            else:
                assert False

        def add_line(a_y, b_y):
            print(
                f'<line x1="{a_x}" y1="{a_y}" x2="{b_x}" y2="{b_y}" stroke="black" />',
                file=f,
            )

        def add_window(y, size):
            print(
                f'<text x="{20}" y="{y}" text-anchor="start" dominant-baseline="middle">WND={size}</text>',
                file=f,
            )

        def add_desc(desc):
            print(
                f'<text x="0" y="0" text-anchor="start" dominant-baseline="middle">',
                file=f,
            )
            dy = 0
            for i, line in enumerate(desc.split("\n")):
                dy += 15
                if line != "":
                    print(f'<tspan x="{b_x + 100}" dy="{dy}">{line}</tspan>', file=f)
                    dy = 0
            print(
                f"</text>",
                file=f,
            )

        print(f'<svg height="1000px" xmlns="http://www.w3.org/2000/svg">', file=f)
        print(
            f'<line x1="{a_x}" y1="10" x2="{a_x}" y2="{line_height}" stroke="black" />',
            file=f,
        )
        print(
            f'<line x1="{b_x}" y1="10" x2="{b_x}" y2="{line_height}" stroke="black" />',
            file=f,
        )
        print(
            f'<text x="{a_x}" y="{station_height}" text-anchor="middle" dominant-baseline="middle">A</text>',
            file=f,
        )
        print(
            f'<text x="{b_x}" y="{station_height}" text-anchor="middle" dominant-baseline="middle">B</text>',
            file=f,
        )

        if window == 1:
            t0 = 20

            add_annotation(t0, "T0", "A")
            add_annotation(t0, "T0", "B")
            add_window(t0, 1)

            lat_1_b = 50
            t1 = t0 + lat_1_b
            add_annotation(t1, "T1", "A")
            add_range(t0, t1, "1/B", "A")
            add_window(t1, "1->0")

            lat_d = 80
            t2 = t0 + lat_d
            t3 = t2 + lat_1_b
            add_annotation(t2, "T2", "B")
            add_annotation(t3, "T3", "B")
            add_range(t0, t2, "D", "B")
            add_range(t2, t3, "1/B", "B")
            add_line(t0, t2)
            add_line(t1, t3)

            lat_a_b = 30
            t4 = t3 + lat_a_b
            add_annotation(t4, "T4", "B")
            add_range(t3, t4, "A/B", "B")

            t5 = t3 + lat_d
            add_annotation(t5, "T5", "A")
            add_line(t5, t3)

            t6 = t5 + lat_a_b
            add_annotation(t6, "T6", "A")
            add_annotation(t6, "T6", "B")
            add_range(t5, t6, "A/B", "A")
            add_range(t4, t6, "D", "B")
            add_line(t6, t4)
            add_window(t6, "0->1")

            t7 = t6 + lat_1_b
            add_annotation(t7, "T7", "A")
            add_range(t6, t7, "1/B", "A")
            add_window(t7, "1->0")

            t8 = t6 + lat_d
            add_annotation(t8, "T8", "B")
            add_range(t6, t8, "D", "B")
            add_line(t6, t8)

            t9 = t7 + lat_d
            add_annotation(t9, "T9", "B")
            add_range(t8, t9, "1/B", "B")
            add_line(t7, t9)

            t10 = t9 + lat_a_b
            add_annotation(t10, "T10", "B")
            add_range(t9, t10, "A/B", "B")

            t11 = t9 + lat_d
            add_annotation(t11, "T11", "A")
            add_line(t11, t9)

            t12 = t10 + lat_d
            add_annotation(t12, "T12", "A")
            add_line(t12, t10)
            add_annotation(t12, "T12", "B")
            add_range(t10, t12, "D", "B")
            add_range(t11, t12, "A/B", "A")

            add_desc(
                """
    约定：
    - D 是传输延迟（单位：s）
    - B 是带宽（单位：帧/s）
    - W 是发送窗口大小（单位：帧）
    - A 是确认帧大小（单位：帧）
    - WND 表示 A 的发送窗口中还可以发送的帧的个数

    假设发送窗口大小为一个帧（W=1）
    T0 时刻：A 开始发送一个帧
    T0 ~ T1：发送一个帧，耗时 1/B
    T1 时刻：A 完成发送一个帧

    A 发送的帧经过传播延迟 D 到达 B
    T2 时刻：B 开始接收一个帧
    T0 ~ T2：耗时 D
    T3 时刻：B 完成接收一个帧
    T1 ~ T3：耗时 D

    T3 时刻 B 收到了完整的一个帧，给 A 发送一个确认帧
    假设确认帧的大小是 A（单位：帧）

    T3 时刻：B 开始发送一个确认帧
    T3 ~ T4：发送一个确认帧，耗时 A/B
    T4 时刻：B 完成发送一个确认帧

    B 发送的确认帧经过传播延迟 D 到达 A

    T5 时刻：A 开始收到一个确认帧
    T5 ~ T6：接收一个确认帧，耗时 A/B
    T6 时刻：A 完成接收一个确认帧

    此时 A 接收到确认帧，可以继续发送新的帧
    之后按照同样的流程进行循环，得到 T7 ~ T12

    在 T0 ~ T6 的一个周期内，传输了 1 个帧的数据，耗费了 D+1/B+A/B+D 的时间

    链路利用率等于 (1/B)/(2D+1/B+A/B)

    如果确认帧很小可以忽略，那么 A=0，链路利用率等于 1/(2BD+1)

    如果确认捎带在数据帧中传输，那么 A=1，链路利用率等于 1/(2BD+2)

    """
            )
        elif window == 3:
            t0 = 20

            add_annotation(t0, "T0", "A")
            add_annotation(t0, "T0", "B")
            add_window(t0, 3)

            lat_1_b = 50
            t1 = t0 + lat_1_b
            add_annotation(t1, "T1", "A")
            add_range(t0, t1, "1/B", "A")
            add_window(t1, "3->2")

            add_annotation(t1 + lat_1_b, "", "A")
            add_range(t1, t1 + lat_1_b, "1/B", "A")
            add_window(t1 + lat_1_b, "2->1")

            add_annotation(t1 + lat_1_b * 2, "", "A")
            add_range(t1 + lat_1_b, t1 + lat_1_b * 2, "1/B", "A")
            add_window(t1 + lat_1_b * 2, "1->0")

            lat_d = 80
            t2 = t0 + lat_d
            t3 = t2 + lat_1_b
            add_annotation(t2, "T2", "B")
            add_annotation(t3, "T3", "B")
            add_range(t0, t2, "D", "B")
            add_range(t2, t3, "1/B", "B")
            add_line(t0, t2)
            add_line(t1, t3)

            add_annotation(t3 + lat_1_b, "", "B")
            add_line(t1 + lat_1_b, t3 + lat_1_b)

            add_annotation(t3 + lat_1_b * 2, "", "B")
            add_line(t1 + lat_1_b * 2, t3 + lat_1_b * 2)

            lat_a_b = 30
            t4 = t3 + lat_a_b
            add_annotation(t4, "T4", "B")
            add_range(t3, t4, "A/B", "B")

            t5 = t3 + lat_d
            add_annotation(t5, "T5", "A")
            add_line(t5, t3)

            t6 = t5 + lat_a_b
            add_annotation(t6, "T6", "A")
            add_annotation(t6, "T6", "B")
            add_range(t5, t6, "A/B", "A")
            add_range(t4, t6, "D", "B")
            add_line(t6, t4)
            add_window(t6, "0->1")

            add_annotation(t3 + lat_1_b + lat_d, "", "A")
            add_annotation(t3 + lat_1_b + lat_d + lat_a_b, "", "A")
            add_annotation(t3 + lat_1_b + lat_a_b, "", "B")
            add_line(t3 + lat_1_b + lat_d, t3 + lat_1_b)
            add_line(t3 + lat_1_b + lat_d + lat_a_b, t3 + lat_1_b + lat_a_b)

            add_annotation(t3 + lat_1_b * 2 + lat_d, "", "A")
            add_annotation(t3 + lat_1_b * 2 + lat_d + lat_a_b, "", "A")
            add_annotation(t3 + lat_1_b * 2 + lat_a_b, "", "B")
            add_line(t3 + lat_1_b * 2 + lat_d, t3 + lat_1_b * 2)
            add_line(t3 + lat_1_b * 2 + lat_d + lat_a_b, t3 + lat_1_b * 2 + lat_a_b)

            t7 = t6 + lat_1_b
            add_annotation(t7, "T7", "A")
            add_range(t6, t7, "1/B", "A")
            add_window(t7, "1->0->1")

            add_annotation(t7 + lat_1_b, "", "A")
            add_annotation(t7 + lat_1_b + lat_d, "", "B")
            add_window(t7 + lat_1_b, "1->0->1")
            add_line(t7 + lat_1_b, t7 + lat_1_b + lat_d)

            add_annotation(t7 + lat_1_b * 2, "", "A")
            add_annotation(t7 + lat_1_b * 2 + lat_d, "", "B")
            add_window(t7 + lat_1_b * 2, "1->0")
            add_line(t7 + lat_1_b * 2, t7 + lat_1_b * 2 + lat_d)

            t8 = t6 + lat_d
            add_annotation(t8, "T8", "B")
            add_range(t6, t8, "D", "B")
            add_line(t6, t8)

            t9 = t7 + lat_d
            add_annotation(t9, "T9", "B")
            add_range(t8, t9, "1/B", "B")
            add_line(t7, t9)

            t10 = t9 + lat_a_b
            add_annotation(t10, "T10", "B")
            add_range(t9, t10, "A/B", "B")

            t11 = t9 + lat_d
            add_annotation(t11, "T11", "A")
            add_line(t11, t9)

            t12 = t10 + lat_d
            add_annotation(t12, "T12", "A")
            add_line(t12, t10)
            add_annotation(t12, "T12", "B")
            add_range(t10, t12, "D", "B")
            add_range(t11, t12, "A/B", "A")

        print(f"</svg>", file=f)


gen_svg("window_1.svg", 1)
gen_svg("window_3.svg", 3)
