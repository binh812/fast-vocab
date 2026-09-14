#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Round 2: sửa các va chạm mới sinh ra sau round 1 (gói tiếng Anh)."""
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "en")

WORD_PATCH = {
325: dict(ru="spatula", phonetic="SPACH-uh-luh", pos="n", meaning="cái xẻng/muỗng lật (dụng cụ nấu ăn)",
    usage="Dụng cụ dùng để lật/trộn thức ăn khi nấu.",
    example_ru="Use a spatula to flip the pancake.", example_vi="Dùng xẻng lật để lật bánh kếp."),
996: dict(ru="furious", phonetic="FYOOR-ee-us", pos="adj", meaning="giận dữ, điên tiết",
    usage="Diễn tả sự tức giận mạnh mẽ, hơn cả 'angry'.",
    example_ru="She was furious about the delay.", example_vi="Cô ấy giận dữ vì sự chậm trễ."),
452: dict(ru="commute", phonetic="kuh-MYOOT", pos="v", meaning="đi làm/đi học hàng ngày (di chuyển thường xuyên)",
    usage="Diễn tả việc di chuyển thường xuyên giữa nhà và nơi làm việc.",
    example_ru="I commute to work by train.", example_vi="Tôi đi làm bằng tàu hỏa hàng ngày."),
695: dict(ru="jet bridge", phonetic="JET BRIJ", pos="phrase", meaning="cầu ống dẫn khách lên máy bay",
    usage="Cầu nối từ nhà ga tới cửa máy bay.",
    example_ru="We boarded through the jet bridge.", example_vi="Chúng tôi lên máy bay qua cầu ống dẫn."),
492: dict(ru="bathrobe", phonetic="BATH-rohb", pos="n", meaning="áo choàng tắm",
    usage="Đồ dùng trong phòng khách sạn để mặc sau khi tắm.",
    example_ru="There's a bathrobe behind the door.", example_vi="Có áo choàng tắm phía sau cửa."),
508: dict(ru="mini fridge", phonetic="MIN-ee FRIJ", pos="n", meaning="tủ lạnh mini",
    usage="Tủ lạnh nhỏ trong phòng khách sạn dùng để đựng đồ uống/snack.",
    example_ru="There's a mini fridge under the TV.", example_vi="Có một tủ lạnh mini dưới ti vi."),
603: dict(ru="loyalty card", phonetic="LOY-ul-tee KARD", pos="phrase", meaning="thẻ khách hàng thân thiết",
    usage="Thẻ tích điểm khi mua sắm thường xuyên.",
    example_ru="Do you have a loyalty card?", example_vi="Bạn có thẻ khách hàng thân thiết không?"),
605: dict(ru="clearance sale", phonetic="KLEER-ens SAYL", pos="phrase", meaning="đợt xả hàng giảm giá",
    usage="Chương trình giảm giá để xả hàng tồn.",
    example_ru="There's a clearance sale this weekend.", example_vi="Cuối tuần này có đợt xả hàng giảm giá."),
620: dict(ru="store credit", phonetic="STOR KRED-it", pos="phrase", meaning="tiền hoàn lại dưới dạng voucher mua hàng tiếp",
    usage="Khi trả hàng, thay vì hoàn tiền mặt, cửa hàng cho voucher dùng tiếp.",
    example_ru="I got store credit instead of a refund.", example_vi="Tôi được voucher mua hàng thay vì hoàn tiền."),
614: dict(ru="return policy", phonetic="ri-TURN POL-uh-see", pos="phrase", meaning="chính sách đổi trả",
    usage="Quy định về việc đổi/trả hàng của cửa hàng.",
    example_ru="What's your return policy?", example_vi="Chính sách đổi trả của cửa hàng là gì?"),
615: dict(ru="cashback", phonetic="KASH-bak", pos="n", meaning="hoàn tiền mặt (khi thanh toán bằng thẻ)",
    usage="Một phần tiền được hoàn lại khi mua sắm/thanh toán bằng thẻ.",
    example_ru="This card offers 2% cashback.", example_vi="Thẻ này hoàn lại 2% tiền mặt."),
618: dict(ru="service charge", phonetic="SUR-vis CHARJ", pos="phrase", meaning="phí dịch vụ",
    usage="Khoản phí thêm cho dịch vụ (nhà hàng/khách sạn).",
    example_ru="Is there a service charge included?", example_vi="Có tính phí dịch vụ không?"),
970: dict(ru="impressive", phonetic="im-PRES-iv", pos="adj", meaning="ấn tượng",
    usage="Khen điều gì đó gây ấn tượng mạnh.",
    example_ru="Your presentation was impressive.", example_vi="Bài thuyết trình của bạn rất ấn tượng."),
680: dict(ru="arrival hall", phonetic="uh-RY-vul HAWL", pos="phrase", meaning="sảnh đến (nơi đón khách)",
    usage="Khu vực đón khách sau khi hạ cánh.",
    example_ru="Meet me at the arrival hall.", example_vi="Hãy đón tôi ở sảnh đến."),
673: dict(ru="connecting gate", phonetic="kuh-NEK-ting GAYT", pos="phrase", meaning="cổng nối chuyến",
    usage="Cổng ra để lên chuyến bay nối tiếp.",
    example_ru="Follow the signs to the connecting gate.", example_vi="Hãy đi theo biển chỉ dẫn đến cổng nối chuyến."),
674: dict(ru="boarding announcement", phonetic="BOR-ding uh-NOWNS-ment", pos="phrase", meaning="thông báo mời lên máy bay",
    usage="Thông báo qua loa mời hành khách lên máy bay.",
    example_ru="We heard the boarding announcement.", example_vi="Chúng tôi nghe thấy thông báo mời lên máy bay."),
679: dict(ru="transit passenger", phonetic="TRAN-zit PAS-en-jer", pos="phrase", meaning="hành khách quá cảnh",
    usage="Hành khách đang chờ chuyến bay nối tiếp, không nhập cảnh.",
    example_ru="Transit passengers should stay in this area.", example_vi="Hành khách quá cảnh nên ở lại khu vực này."),
681: dict(ru="standby passenger", phonetic="STAND-by PAS-en-jer", pos="phrase", meaning="hành khách chờ vé (chưa xác nhận chỗ)",
    usage="Hành khách chờ để được xếp chỗ khi có ghế trống.",
    example_ru="I'm flying standby today.", example_vi="Hôm nay tôi bay theo diện chờ vé."),
683: dict(ru="control tower", phonetic="kun-TROHL TOW-er", pos="phrase", meaning="đài kiểm soát không lưu",
    usage="Nơi điều phối máy bay cất/hạ cánh tại sân bay.",
    example_ru="The control tower gave clearance to land.", example_vi="Đài kiểm soát không lưu đã cho phép hạ cánh."),
684: dict(ru="body scanner", phonetic="BOD-ee SKAN-er", pos="phrase", meaning="máy quét an ninh toàn thân",
    usage="Thiết bị kiểm tra an ninh toàn thân tại sân bay.",
    example_ru="Step into the body scanner, please.", example_vi="Mời bạn bước vào máy quét an ninh."),
709: dict(ru="restricted item", phonetic="ri-STRIK-tid Y-tem", pos="phrase", meaning="vật phẩm bị hạn chế/cấm mang theo",
    usage="Những vật phẩm không được phép mang lên máy bay.",
    example_ru="Liquids over 100ml are restricted items.", example_vi="Chất lỏng trên 100ml là vật phẩm bị hạn chế."),
708: dict(ru="priority boarding", phonetic="pry-OR-uh-tee BOR-ding", pos="phrase", meaning="lên máy bay ưu tiên",
    usage="Dành cho hành khách hạng thương gia hoặc có trẻ nhỏ.",
    example_ru="Priority boarding starts now.", example_vi="Lên máy bay ưu tiên bắt đầu ngay bây giờ."),
702: dict(ru="flight number", phonetic="FLYT NUM-ber", pos="phrase", meaning="số hiệu chuyến bay",
    usage="Dùng để tra cứu thông tin chuyến bay.",
    example_ru="What's your flight number?", example_vi="Số hiệu chuyến bay của bạn là gì?"),
766: dict(ru="gauze", phonetic="GAWZ", pos="n", meaning="gạc y tế",
    usage="Dùng để băng bó vết thương.",
    example_ru="Cover the wound with gauze.", example_vi="Hãy băng vết thương bằng gạc."),
773: dict(ru="blood type", phonetic="BLUD TYP", pos="phrase", meaning="nhóm máu",
    usage="Thông tin y tế quan trọng cần biết.",
    example_ru="What's your blood type?", example_vi="Nhóm máu của bạn là gì?"),
780: dict(ru="specialist", phonetic="SPESH-uh-list", pos="n", meaning="bác sĩ chuyên khoa",
    usage="Bác sĩ chuyên sâu về một lĩnh vực y tế cụ thể.",
    example_ru="You should see a specialist.", example_vi="Bạn nên đi khám bác sĩ chuyên khoa."),
858: dict(ru="stakeholder", phonetic="STAYK-hohl-der", pos="n", meaning="bên liên quan (trong dự án/công ty)",
    usage="Cá nhân/tổ chức có lợi ích liên quan đến một dự án.",
    example_ru="We need approval from all stakeholders.", example_vi="Chúng tôi cần sự chấp thuận từ tất cả các bên liên quan."),
911: dict(ru="turnover", phonetic="TURN-oh-ver", pos="n", meaning="doanh thu (cách nói khác, phổ biến ở Anh-Anh)",
    usage="Tổng doanh thu của công ty, hay dùng trong tiếng Anh-Anh.",
    example_ru="Annual turnover reached two million dollars.", example_vi="Doanh thu hàng năm đạt hai triệu đô la."),
917: dict(ru="milestone", phonetic="MYL-stohn", pos="n", meaning="cột mốc (trong dự án)",
    usage="Một mốc quan trọng đánh dấu tiến độ dự án.",
    example_ru="We reached an important milestone.", example_vi="Chúng tôi đã đạt một cột mốc quan trọng."),
981: dict(ru="ambitious", phonetic="am-BISH-us", pos="adj", meaning="đầy tham vọng, có chí tiến thủ",
    usage="Khen ai đó có tham vọng, mục tiêu lớn.",
    example_ru="She's very ambitious about her career.", example_vi="Cô ấy rất có chí tiến thủ trong sự nghiệp."),
986: dict(ru="cheerful", phonetic="CHEER-ful", pos="adj", meaning="vui vẻ, phấn khởi",
    usage="Diễn tả tính cách/tâm trạng vui vẻ.",
    example_ru="She's always cheerful in the morning.", example_vi="Cô ấy luôn vui vẻ vào buổi sáng."),
958: dict(ru="polite", phonetic="puh-LYT", pos="adj", meaning="lịch sự",
    usage="Khen ai đó cư xử lịch sự.",
    example_ru="The staff here are very polite.", example_vi="Nhân viên ở đây rất lịch sự."),
957: dict(ru="punctual", phonetic="PUNK-choo-ul", pos="adj", meaning="đúng giờ",
    usage="Khen ai đó luôn đến đúng giờ.",
    example_ru="He's always punctual for meetings.", example_vi="Anh ấy luôn đến họp đúng giờ."),
}

SENT_PATCH = {
668: dict(ru="Can I try this on?", phonetic="kan I try this ON?",
    meaning="Tôi có thể thử đồ này được không?",
    note="Hỏi khi muốn thử quần áo trước khi mua, nói với nhân viên bán hàng."),
727: dict(ru="How much is a taxi to the airport?", phonetic="how much iz uh TAK-see too thee AIR-port?",
    meaning="Đi taxi ra sân bay hết bao nhiêu tiền?",
    note="Hỏi giá trước khi lên taxi, đặc biệt hữu ích khi đi ra sân bay."),
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
    return f"words_{(iid - 1) // 200 + 1}.json"

def sent_chunk(iid):
    return f"sentences_{(iid - 1) // 200 + 1}.json"

patch_kind("words", WORD_PATCH, word_chunk)
patch_kind("sentences", SENT_PATCH, sent_chunk)
print("Done.")
