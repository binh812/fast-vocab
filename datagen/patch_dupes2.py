#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Round 2: fix new collisions created by round-1 replacements."""
import json, os

ROOT = os.path.dirname(os.path.abspath(__file__))

WORD_PATCH = {
417: dict(ru="объезд", phonetic="ab-YEZD", pos="n", meaning="đường vòng, đường tránh",
    usage="Dùng khi phải đi đường vòng do tắc đường hoặc sửa chữa.",
    example_ru="Из-за ремонта дороги нужен объезд.", example_vi="Do sửa đường nên phải đi vòng."),
489: dict(ru="уборщица", phonetic="u-BOR-shchi-tsa", pos="n", meaning="nhân viên dọn phòng (nữ)",
    usage="Người dọn dẹp phòng khách sạn hàng ngày.",
    example_ru="Уборщица придёт после обеда.", example_vi="Nhân viên dọn phòng sẽ đến sau bữa trưa."),
526: dict(ru="халат", phonetic="kha-LAT", pos="n", meaning="áo choàng tắm",
    usage="Đồ dùng trong phòng khách sạn, mặc sau khi tắm.",
    example_ru="В шкафу есть халат и тапочки.", example_vi="Trong tủ có áo choàng tắm và dép đi trong phòng."),
527: dict(ru="тапочки", phonetic="TA-pach-ki", pos="n", meaning="dép đi trong phòng",
    usage="Dép khách sạn cung cấp sẵn trong phòng.",
    example_ru="Тапочки стоят у кровати.", example_vi="Dép đi trong phòng để cạnh giường."),
678: dict(ru="зал прилёта", phonetic="ZAL pri-LYO-ta", pos="phrase", meaning="sảnh đến (nơi đón khách)",
    usage="Khu vực đón người sau khi hạ cánh.",
    example_ru="Встречающие ждут в зале прилёта.", example_vi="Người đón chờ ở sảnh đến."),
603: dict(ru="универмаг", phonetic="u-ni-ver-MAG", pos="n", meaning="cửa hàng bách hóa",
    usage="Cửa hàng lớn bán nhiều loại hàng hóa khác nhau.",
    example_ru="В центре есть большой универмаг.", example_vi="Ở trung tâm có một cửa hàng bách hóa lớn."),
609: dict(ru="безналичный расчёт", phonetic="bez-na-LICH-ny ras-CHYOT", pos="phrase", meaning="thanh toán không dùng tiền mặt",
    usage="Hình thức thanh toán qua thẻ/chuyển khoản thay vì tiền mặt.",
    example_ru="Мы принимаем безналичный расчёт.", example_vi="Chúng tôi chấp nhận thanh toán không dùng tiền mặt."),
612: dict(ru="гарантийный талон", phonetic="ga-ran-TIY-ny ta-LON", pos="phrase", meaning="phiếu bảo hành",
    usage="Giữ lại khi mua đồ điện tử để được bảo hành.",
    example_ru="Не теряйте гарантийный талон.", example_vi="Đừng làm mất phiếu bảo hành."),
641: dict(ru="мелочь", phonetic="MYE-lach'", pos="n", meaning="tiền lẻ",
    usage="Dùng khi hỏi có tiền lẻ để trả không.",
    example_ru="У вас есть мелочь?", example_vi="Bạn có tiền lẻ không?"),
618: dict(ru="оптом", phonetic="OP-tam", pos="adv", meaning="mua sỉ, bán buôn",
    usage="Mua số lượng lớn với giá rẻ hơn so với mua lẻ.",
    example_ru="Этот товар продаётся только оптом.", example_vi="Mặt hàng này chỉ bán sỉ."),
630: dict(ru="уценка", phonetic="u-TSEN-ka", pos="n", meaning="hàng giảm giá/hạ giá",
    usage="Sản phẩm được giảm giá do lỗi nhỏ hoặc lỗi mốt.",
    example_ru="Эта куртка продаётся по уценке.", example_vi="Chiếc áo khoác này đang được bán giảm giá."),
640: dict(ru="гипермаркет", phonetic="gi-per-mar-KYET", pos="n", meaning="đại siêu thị",
    usage="Siêu thị quy mô rất lớn, thường ở ngoại ô hoặc trung tâm mua sắm.",
    example_ru="Гипермаркет находится за городом.", example_vi="Đại siêu thị nằm ở ngoại ô thành phố."),
656: dict(ru="ассортимент", phonetic="a-sar-ti-MENT", pos="n", meaning="chủng loại hàng hóa",
    usage="Nói về sự đa dạng hàng hóa trong một cửa hàng.",
    example_ru="У них большой ассортимент товаров.", example_vi="Cửa hàng của họ có nhiều chủng loại hàng hóa."),
671: dict(ru="справочная", phonetic="SPRA-vach-na-ya", pos="n", meaning="quầy thông tin",
    usage="Quầy hỏi đáp thông tin ở sân bay/nhà ga.",
    example_ru="Спросите в справочной, где найти носильщика.", example_vi="Hãy hỏi ở quầy thông tin để tìm người khuân vác."),
672: dict(ru="разрешённая норма", phonetic="raz-re-SHYON-na-ya NOR-ma", pos="phrase", meaning="định mức được phép (miễn thuế)",
    usage="Giới hạn số lượng hàng hóa được mang qua biên giới miễn thuế.",
    example_ru="Какая разрешённая норма провоза алкоголя?", example_vi="Định mức rượu được mang qua miễn thuế là bao nhiêu?"),
673: dict(ru="въездной штамп", phonetic="vyez-DNOY SHTAMP", pos="phrase", meaning="dấu nhập cảnh (đóng vào hộ chiếu)",
    usage="Dấu đóng vào hộ chiếu khi nhập cảnh vào một nước.",
    example_ru="Пограничник поставил въездной штамп.", example_vi="Nhân viên biên phòng đã đóng dấu nhập cảnh."),
696: dict(ru="носильщик", phonetic="na-SIL'-shchik", pos="n", meaning="người khuân vác hành lý",
    usage="Thuê người khuân vác hành lý tại sân bay/ga tàu.",
    example_ru="Носильщик поможет донести чемоданы.", example_vi="Người khuân vác sẽ giúp mang vali."),
712: dict(ru="приоритетная посадка", phonetic="pri-a-ri-TYET-na-ya pa-SAD-ka", pos="phrase", meaning="lên máy bay ưu tiên",
    usage="Dành cho hành khách hạng thương gia hoặc có trẻ nhỏ, người khuyết tật.",
    example_ru="Приоритетная посадка начинается первой.", example_vi="Lên máy bay ưu tiên được thực hiện đầu tiên."),
762: dict(ru="процедура", phonetic="pra-tse-DU-ra", pos="n", meaning="thủ thuật y tế",
    usage="Quy trình khám hoặc chữa bệnh cụ thể tại bệnh viện.",
    example_ru="Эта процедура займёт полчаса.", example_vi="Thủ thuật này sẽ mất nửa tiếng."),
767: dict(ru="капли", phonetic="KAP-li", pos="n", meaning="thuốc nhỏ (mắt/mũi)",
    usage="Thuốc dạng nhỏ giọt để trị bệnh mắt/mũi.",
    example_ru="Врач назначил капли от насморка.", example_vi="Bác sĩ kê thuốc nhỏ mũi."),
778: dict(ru="справка", phonetic="SPRAV-ka", pos="n", meaning="giấy chứng nhận (y tế)",
    usage="Giấy xác nhận tình trạng sức khỏe do bác sĩ cấp.",
    example_ru="Мне нужна справка от врача.", example_vi="Tôi cần giấy chứng nhận của bác sĩ."),
803: dict(ru="заморозки", phonetic="za-MO-raz-ki", pos="n", meaning="sương giá, băng giá nhẹ",
    usage="Hiện tượng thời tiết lạnh đột ngột, thường đầu/cuối mùa.",
    example_ru="Ночью были заморозки.", example_vi="Đêm qua có sương giá."),
895: dict(ru="приказ", phonetic="pri-KAZ", pos="n", meaning="chỉ thị, quyết định (văn bản)",
    usage="Văn bản chỉ đạo chính thức trong công ty.",
    example_ru="Директор подписал приказ.", example_vi="Giám đốc đã ký quyết định."),
855: dict(ru="накладные расходы", phonetic="nak-LAD-ny-ye ras-KHO-dy", pos="phrase", meaning="chi phí phát sinh/quản lý",
    usage="Các khoản chi phí gián tiếp trong hoạt động kinh doanh.",
    example_ru="Накладные расходы выросли в этом квартале.", example_vi="Chi phí phát sinh đã tăng trong quý này."),
896: dict(ru="показатель", phonetic="pa-ka-ZA-tel'", pos="n", meaning="chỉ số (kinh doanh)",
    usage="Các chỉ số đánh giá hiệu quả công việc/kinh doanh.",
    example_ru="Показатели продаж выросли.", example_vi="Các chỉ số bán hàng đã tăng."),
870: dict(ru="аутсорсинг", phonetic="aut-SOR-sing", pos="n", meaning="thuê ngoài (dịch vụ)",
    usage="Thuê công ty bên ngoài thực hiện một phần công việc.",
    example_ru="Мы передали бухгалтерию на аутсорсинг.", example_vi="Chúng tôi đã thuê ngoài dịch vụ kế toán."),
888: dict(ru="оборот", phonetic="a-ba-ROT", pos="n", meaning="doanh thu (luân chuyển vốn)",
    usage="Tổng doanh thu của công ty trong một kỳ.",
    example_ru="Годовой оборот компании увеличился.", example_vi="Doanh thu hàng năm của công ty đã tăng."),
890: dict(ru="реквизиты", phonetic="rek-vi-ZI-ty", pos="n", meaning="thông tin (tài khoản/công ty) để giao dịch",
    usage="Thông tin cần thiết để chuyển khoản hoặc lập hóa đơn.",
    example_ru="Пришлите, пожалуйста, банковские реквизиты.", example_vi="Vui lòng gửi thông tin tài khoản ngân hàng."),
913: dict(ru="оклад", phonetic="ak-LAD", pos="n", meaning="lương cơ bản",
    usage="Mức lương cố định hàng tháng, chưa gồm thưởng.",
    example_ru="Какой оклад на этой позиции?", example_vi="Lương cơ bản của vị trí này là bao nhiêu?"),
920: dict(ru="репутация", phonetic="re-pu-TA-tsi-ya", pos="n", meaning="uy tín, danh tiếng",
    usage="Nói về uy tín của một công ty hoặc cá nhân.",
    example_ru="У этой компании хорошая репутация.", example_vi="Công ty này có uy tín tốt."),
941: dict(ru="любопытный", phonetic="lyu-ba-PYT-ny", pos="adj", meaning="tò mò",
    usage="Diễn tả tính cách hay tò mò, thích khám phá.",
    example_ru="Дети очень любопытные.", example_vi="Trẻ con rất tò mò."),
946: dict(ru="скромный", phonetic="SKROM-ny", pos="adj", meaning="khiêm tốn",
    usage="Khen ai đó khiêm tốn, không phô trương.",
    example_ru="Он очень скромный, несмотря на успех.", example_vi="Anh ấy rất khiêm tốn dù đã thành công."),
990: dict(ru="надёжный", phonetic="na-DYOZH-ny", pos="adj", meaning="đáng tin cậy",
    usage="Khen ai đó đáng tin cậy, chắc chắn.",
    example_ru="Он очень надёжный партнёр.", example_vi="Anh ấy là một đối tác rất đáng tin cậy."),
}

SENT_PATCH = {
611: dict(ru="Есть ли примерочная в этом магазине?",
    phonetic="YEST' li pri-MYE-rach-na-ya v E-tam ma-ga-ZI-nye?",
    meaning="Cửa hàng này có phòng thử đồ không?",
    note="Hỏi khi muốn thử quần áo trước khi mua."),
}

def patch_kind(kind, patch, id_to_chunk):
    changed_files = set()
    for iid, fields in patch.items():
        chunk = id_to_chunk(iid)
        path = os.path.join(ROOT, chunk)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        found = False
        for it in data:
            if it["id"] == iid:
                for k, v in fields.items():
                    it[k] = v
                found = True
                break
        if not found:
            raise SystemExit(f"id {iid} not found in {chunk}")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=None)
        changed_files.add(chunk)
    print(f"{kind}: patched {len(patch)} ids across files {sorted(changed_files)}")

def word_chunk(iid):
    idx = (iid - 1) // 200 + 1
    return f"words_{idx}.json"

def sent_chunk(iid):
    idx = (iid - 1) // 200 + 1
    return f"sentences_{idx}.json"

patch_kind("words", WORD_PATCH, word_chunk)
patch_kind("sentences", SENT_PATCH, sent_chunk)
print("Done.")
