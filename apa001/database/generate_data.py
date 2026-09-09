#!/usr/bin/env python3
"""
Generador masivo de datos sintéticos realistas para Ferizamart POS (a001).
Genera el archivo 05_massive_test_data.sql con:
- > 165 Productos (>=55 por categoría: Dulcería, Materias Primas, Regalos)
- > 300 Lotes con semáforos de caducidad
- Precios fraccionados y de mayoreo
- 10+ Servicios
- 8+ Paquetes/Combos Piñateros con componentes
- 50+ Pedidos Especiales (2023 - 2026)
- 50+ Apartados con abonos e items (2023 - 2026)
- > 1,150 Ventas y Tickets (2023 - 2026) con partidas detalladas
- Registros de auditoría y configuración
"""

import random
import datetime

random.seed(42)

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val)
    val_str = str(val).replace("'", "''")
    return f"'{val_str}'"

# Extra subcategories to add for completeness:
extra_subcategories = [
    (1, 'Dulces Tradicionales Mexicanos', 'dulceria-tradicionales', 'Mazapanes, tamarindos, glorias, alegrías'),
    (1, 'Botanas y Frituras', 'dulceria-botanas', 'Papas, cacahuates y botanas saladas'),
    (2, 'Coberturas y Chocolatería', 'materias-coberturas', 'Chocolates para fundir y granillos'),
    (2, 'Desechables para Fiesta', 'materias-desechables', 'Platos, vasos, tenedores y servilletas'),
    (2, 'Bases y Capacillos', 'materias-bases-capacillos', 'Bases de cartón, blondas y capacillos para cupcakes'),
    (3, 'Moños y Envolturas', 'regalos-monos-envolturas', 'Moños mágicos, listones celiseda y papel fantasía'),
    (3, 'Juguetes Novedad y Piñatería', 'regalos-juguetes-novedad', 'Juguetitos para piñata y recuerditos'),
    (3, 'Arreglos y Canastas', 'regalos-arreglos', 'Arreglos preparados con dulces y globos')
]

# Dulcería (target >= 55)
dulceria_raw = [
    # Chicles (subcat 1)
    ("Trident Menta 18s", "CHI-TRI-MEN18", "750100010001", 18.00, 24.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Trident Yerbabuena 18s", "CHI-TRI-YER18", "750100010002", 18.00, 24.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Trident Sandía 18s", "CHI-TRI-SAN18", "750100010003", 18.00, 24.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Bubbaloo Mora Azul Bolsa 50pz", "CHI-BUB-MOR50", "750100010004", 45.00, 60.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Bubbaloo Tutti Frutti Bolsa 50pz", "CHI-BUB-TUT50", "750100010005", 45.00, 60.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Bubbaloo Plátano Bolsa 50pz", "CHI-BUB-PLA50", "750100010006", 45.00, 60.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Clorets 4 Pastillas Display 20pz", "CHI-CLO-DIS20", "750100010007", 55.00, 75.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Canel's 4 Pastillas Surtido Bolsa 60pz", "CHI-CAN-SUR60", "750100010008", 32.00, 45.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Halls Mentol Bolsa 100pz", "CHI-HAL-MEN100", "750100010009", 70.00, 95.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Halls Cereza Bolsa 100pz", "CHI-HAL-CER100", "750100010010", 70.00, 95.00, "pza", 1, False, "kg", 0, 1.0, 0),

    # Chocolates (subcat 2)
    ("Carlos V Barra 20g Display 24pz", "CHO-CAR-DIS24", "750100010011", 180.00, 240.00, "pza", 2, False, "kg", 0, 1.0, 0),
    ("Carlos V Blanco 20g Display 24pz", "CHO-CAR-BLA24", "750100010012", 190.00, 250.00, "pza", 2, False, "kg", 0, 1.0, 0),
    ("Bocadín Ricolino Display 50pz", "CHO-BOC-DIS50", "750100010013", 85.00, 115.00, "pza", 2, False, "kg", 0, 1.0, 0),
    ("Kranky Ricolino Bolsa 400g", "CHO-KRA-BOL400", "750100010014", 48.00, 65.00, "pza", 2, True, "kg", 150.00, 0.400, 1.2),
    ("Chocoretas Ricolino Bolsa 450g", "CHO-CHO-BOL450", "750100010015", 52.00, 70.00, "pza", 2, True, "kg", 155.00, 0.450, 0.9),
    ("Kinder Sorpresa Display 24pz", "CHO-KIN-DIS24", "750100010016", 420.00, 560.00, "pza", 2, False, "kg", 0, 1.0, 0),
    ("Kinder Bueno Barra Doble Display 16pz", "CHO-KIN-BUE16", "750100010017", 310.00, 410.00, "pza", 2, False, "kg", 0, 1.0, 0),
    ("KitKat 4 Fingers Display 24pz", "CHO-KIT-DIS24", "750100010018", 340.00, 450.00, "pza", 2, False, "kg", 0, 1.0, 0),
    ("M&M's Chocolate con Leche Bolsa 500g", "CHO-MM-LEC500", "750100010019", 75.00, 105.00, "pza", 2, True, "kg", 210.00, 0.500, 1.5),
    ("M&M's Cacahuate Bolsa 500g", "CHO-MM-CAC500", "750100010020", 75.00, 105.00, "pza", 2, True, "kg", 210.00, 0.500, 1.5),
    ("Turín Conejos Bolsa 30pz", "CHO-TUR-CON30", "750100010021", 160.00, 220.00, "pza", 2, False, "kg", 0, 1.0, 0),
    ("Turín Baileys Tubo 200g", "CHO-TUR-BAI200", "750100010022", 95.00, 135.00, "pza", 2, False, "kg", 0, 1.0, 0),
    ("Hershey's Cookies 'n' Creme Barra 40g Display 12pz", "CHO-HER-COO12", "750100010023", 165.00, 225.00, "pza", 2, False, "kg", 0, 1.0, 0),

    # Paletas (subcat 3)
    ("Tutsi Pop Clásica Bolsa 40pz", "PAL-TUT-CLA40", "750100010024", 58.00, 80.00, "pza", 3, False, "kg", 0, 1.0, 0),
    ("Tutsi Pop Bota Loca Bolsa 40pz", "PAL-TUT-BOT40", "750100010025", 62.00, 85.00, "pza", 3, False, "kg", 0, 1.0, 0),
    ("Paleta Payaso Ricolino Display 15pz", "PAL-PAY-DIS15", "750100010026", 195.00, 260.00, "pza", 3, False, "kg", 0, 1.0, 0),
    ("Paleta Mini Payaso Display 24pz", "PAL-MIN-PAY24", "750100010027", 140.00, 190.00, "pza", 3, False, "kg", 0, 1.0, 0),
    ("Vero Mango Bolsa 40pz", "PAL-VER-MAN40", "750100010028", 68.00, 92.00, "pza", 3, False, "kg", 0, 1.0, 0),
    ("Vero Elote Bolsa 40pz", "PAL-VER-ELO40", "750100010029", 68.00, 92.00, "pza", 3, False, "kg", 0, 1.0, 0),
    ("Vero Manita de la Suerte Bolsa 40pz", "PAL-VER-MANI40", "750100010030", 55.00, 75.00, "pza", 3, False, "kg", 0, 1.0, 0),
    ("Tarrito de Cerveza Vero Bolsa 40pz", "PAL-VER-TAR40", "750100010031", 65.00, 88.00, "pza", 3, False, "kg", 0, 1.0, 0),
    ("Chupirul Vero Bolsa 40pz", "PAL-VER-CHU40", "750100010032", 50.00, 70.00, "pza", 3, False, "kg", 0, 1.0, 0),
    ("Paleta Corona Surtida Bolsa 50pz", "PAL-COR-SUR50", "750100010033", 45.00, 62.00, "pza", 3, False, "kg", 0, 1.0, 0),

    # Gomitas (subcat 4)
    ("Panditas Ricolino Clásicos Bolsa 1kg", "GOM-PAN-CLA1K", "750100010034", 95.00, 135.00, "pza", 4, True, "kg", 135.00, 1.000, 3.5),
    ("Panditas Ricolino Ácidos Bolsa 1kg", "GOM-PAN-ACI1K", "750100010035", 98.00, 138.00, "pza", 4, True, "kg", 138.00, 1.000, 2.8),
    ("Gusanos Ácidos Haribo Bolsa 1kg", "GOM-HAR-GUS1K", "750100010036", 110.00, 155.00, "pza", 4, True, "kg", 155.00, 1.000, 2.0),
    ("Gomitas Ositos Dulces Bolsa 1kg", "GOM-OSI-DUL1K", "750100010037", 80.00, 115.00, "pza", 4, True, "kg", 115.00, 1.000, 4.2),
    ("Gomitas Mangos Enchilados Bolsa 1kg", "GOM-MAN-ENC1K", "750100010038", 85.00, 120.00, "pza", 4, True, "kg", 120.00, 1.000, 3.0),
    ("Gomitas Lombrices Bicolor Bolsa 1kg", "GOM-LOM-BIC1K", "750100010039", 82.00, 118.00, "pza", 4, True, "kg", 118.00, 1.000, 2.5),
    ("Gomitas Pingüinos Dulces Bolsa 1kg", "GOM-PIN-DUL1K", "750100010040", 85.00, 120.00, "pza", 4, True, "kg", 120.00, 1.000, 1.8),
    ("Aros de Durazno Haribo Bolsa 1kg", "GOM-HAR-ARO1K", "750100010041", 115.00, 160.00, "pza", 4, True, "kg", 160.00, 1.000, 2.2),

    # Dulces Enchilados (subcat 5)
    ("Pulparindo De la Rosa Original Caja 20pz", "ENC-PUL-ORI20", "750100010042", 50.00, 70.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Pulparindo Extra Picante Caja 20pz", "ENC-PUL-PIC20", "750100010043", 52.00, 72.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Pulparindo Sandía Caja 20pz", "ENC-PUL-SAN20", "750100010044", 52.00, 72.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Pulparindots Chamoy Bolsa 12pz", "ENC-PUL-DOT12", "750100010045", 60.00, 85.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Lucas Muecas Chamoy Display 10pz", "ENC-LUC-MUE10", "750100010046", 80.00, 110.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Lucas Gusano Líquido Display 10pz", "ENC-LUC-GUS10", "750100010047", 75.00, 105.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Lucas Pelucas Display 12pz", "ENC-LUC-PEL12", "750100010048", 85.00, 115.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Pelón Pelo Rico Display 12pz", "ENC-PEL-RIC12", "750100010049", 95.00, 130.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Pelón Mini Display 18pz", "ENC-PEL-MIN18", "750100010050", 85.00, 118.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Skwinkles Rellenos Sandía Display 12pz", "ENC-SKW-REL12", "750100010051", 90.00, 125.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Skwinkles Clásicos Salsagheti Display 12pz", "ENC-SKW-SAL12", "750100010052", 90.00, 125.00, "pza", 5, False, "kg", 0, 1.0, 0),
    ("Rockaleta Sonric's Bolsa 30pz", "ENC-ROC-SON30", "750100010053", 92.00, 128.00, "pza", 5, False, "kg", 0, 1.0, 0),

    # Galletas y Tradicionales (subcat 6 y extra)
    ("Oreo Original Paquete Familiar 500g", "GAL-ORE-FAM500", "750100010054", 42.00, 58.00, "pza", 6, False, "kg", 0, 1.0, 0),
    ("Emperador Chocolate Paquete 400g", "GAL-EMP-CHO400", "750100010055", 35.00, 48.00, "pza", 6, False, "kg", 0, 1.0, 0),
    ("Emperador Limón Paquete 400g", "GAL-EMP-LIM400", "750100010056", 35.00, 48.00, "pza", 6, False, "kg", 0, 1.0, 0),
    ("Mazapán De la Rosa Gigante Caja 20pz", "TRA-MAZ-GIG20", "750100010057", 85.00, 120.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Mazapán De la Rosa con Chocolate Caja 16pz", "TRA-MAZ-CHO16", "750100010058", 95.00, 132.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Glorias de Linares Tradicionales Caja 10pz", "TRA-GLO-LIN10", "750100010059", 110.00, 150.00, "pza", 1, False, "kg", 0, 1.0, 0),
    ("Obleas con Cajeta Las Sevillanas 20pz", "TRA-OBL-SEV20", "750100010060", 85.00, 118.00, "pza", 1, False, "kg", 0, 1.0, 0)
]

# Materias Primas (target >= 55)
materias_raw = [
    # Harinas y Premezclas (subcat 7)
    ("Harina de Trigo Selecta 1kg", "MAT-HAR-SEL1K", "750200020001", 18.00, 26.00, "pza", 7, True, "kg", 26.00, 1.000, 15.0),
    ("Harina Preparada para Pastel Tres Estrellas Vainilla 500g", "MAT-HAR-PAS-VAI", "750200020002", 28.00, 40.00, "pza", 7, False, "kg", 0, 1.0, 0),
    ("Harina Preparada para Pastel Tres Estrellas Chocolate 500g", "MAT-HAR-PAS-CHO", "750200020003", 28.00, 40.00, "pza", 7, False, "kg", 0, 1.0, 0),
    ("Harina Preparada para Pastel Red Velvet Dawn 1kg", "MAT-HAR-RED-DAW", "750200020004", 65.00, 92.00, "pza", 7, True, "kg", 92.00, 1.000, 4.0),
    ("Harina para Hot Cakes Gamesa 850g", "MAT-HAR-HOT-GAM", "750200020005", 34.00, 48.00, "pza", 7, False, "kg", 0, 1.0, 0),
    ("Fécula de Maíz Maizena Natural 750g", "MAT-FEC-MAI750", "750200020006", 32.00, 45.00, "pza", 7, True, "kg", 60.00, 0.750, 5.0),
    ("Harina de Arroz Tres Estrellas 500g", "MAT-HAR-ARR500", "750200020007", 22.00, 32.00, "pza", 7, False, "kg", 0, 1.0, 0),
    ("Polvo para Hornear Rexal 1kg", "MAT-POL-HOR-REX", "750200020008", 45.00, 65.00, "pza", 7, True, "kg", 65.00, 1.000, 8.0),
    ("Bicarbonato de Sodio Grado Alimenticio 1kg", "MAT-BIC-SOD1K", "750200020009", 30.00, 45.00, "pza", 7, True, "kg", 45.00, 1.000, 10.0),
    ("Grenetina 290 Bloom Especial Repostería 1kg", "MAT-GRE-290-1K", "750200020010", 220.00, 310.00, "pza", 7, True, "kg", 310.00, 1.000, 6.0),

    # Azúcares, Jarabes y Coberturas (subcat 8 & extra)
    ("Azúcar Glass Zarco 1kg", "MAT-AZU-GLA1K", "750200020011", 35.00, 50.00, "pza", 8, True, "kg", 50.00, 1.000, 12.0),
    ("Azúcar Refinada Mascabado 1kg", "MAT-AZU-MAS1K", "750200020012", 38.00, 54.00, "pza", 8, True, "kg", 54.00, 1.000, 8.0),
    ("Jarabe de Glucosa Deiman 1kg", "MAT-JAR-GLU1K", "750200020013", 55.00, 78.00, "pza", 8, True, "kg", 78.00, 1.000, 5.0),
    ("Jarabe de Maíz Karo Bebe 500ml", "MAT-JAR-KAR500", "750200020014", 42.00, 60.00, "pza", 8, False, "lt", 0, 1.0, 0),
    ("Chantilly Top Cream Vainilla 1lt", "MAT-CHA-TOP1L", "750200020015", 68.00, 95.00, "lt", 8, False, "lt", 0, 1.0, 0),
    ("Crema para Batir Lyncott 1lt", "MAT-CRE-LYN1L", "750200020016", 85.00, 118.00, "lt", 8, False, "lt", 0, 1.0, 0),
    ("Cobertura de Chocolate Amargo Alpezzi 1kg", "MAT-COB-AMP1K", "750200020017", 90.00, 130.00, "pza", 8, True, "kg", 130.00, 1.000, 7.5),
    ("Cobertura de Chocolate Blanco Alpezzi 1kg", "MAT-COB-BLA1K", "750200020018", 95.00, 135.00, "pza", 8, True, "kg", 135.00, 1.000, 6.0),
    ("Cobertura de Chocolate con Leche Turín 1kg", "MAT-COB-TUR1K", "750200020019", 140.00, 195.00, "pza", 8, True, "kg", 195.00, 1.000, 5.0),
    ("Granillo de Chocolate Alpezzi 1kg", "MAT-GRA-CHO1K", "750200020020", 75.00, 110.00, "pza", 8, True, "kg", 110.00, 1.000, 4.0),
    ("Granillo de Colores Arcoíris 1kg", "MAT-GRA-COL1K", "750200020021", 70.00, 105.00, "pza", 8, True, "kg", 105.00, 1.000, 4.5),
    ("Fondant Blanco Satin Ice 1kg", "MAT-FON-SAT1K", "750200020022", 120.00, 170.00, "pza", 8, False, "kg", 0, 1.0, 0),
    ("Dulce de Leche Repostero Nestlé 1kg", "MAT-DUL-LEC1K", "750200020023", 85.00, 120.00, "pza", 8, False, "kg", 0, 1.0, 0),
    ("Mermelada de Fresa Horneable San Antonio 1kg", "MAT-MER-FRE1K", "750200020024", 55.00, 80.00, "pza", 8, True, "kg", 80.00, 1.000, 6.0),

    # Colorantes y Esencias (subcat 9 & 10)
    ("Colorante en Gel Enco Rojo Navidad 40g", "MAT-COL-ROJ40", "750200020025", 28.00, 42.00, "pza", 9, False, "pza", 0, 1.0, 0),
    ("Colorante en Gel Enco Azul Real 40g", "MAT-COL-AZU40", "750200020026", 28.00, 42.00, "pza", 9, False, "pza", 0, 1.0, 0),
    ("Colorante en Gel Enco Amarillo Neón 40g", "MAT-COL-AMA40", "750200020027", 28.00, 42.00, "pza", 9, False, "pza", 0, 1.0, 0),
    ("Colorante en Gel Enco Negro Intenso 40g", "MAT-COL-NEG40", "750200020028", 32.00, 48.00, "pza", 9, False, "pza", 0, 1.0, 0),
    ("Colorante en Gel Enco Rosa Fucsia 40g", "MAT-COL-ROS40", "750200020029", 28.00, 42.00, "pza", 9, False, "pza", 0, 1.0, 0),
    ("Colorante en Gel Enco Verde Bosque 40g", "MAT-COL-VER40", "750200020030", 28.00, 42.00, "pza", 9, False, "pza", 0, 1.0, 0),
    ("Polvo Matizador Oro Azteca 10g", "MAT-MAT-ORO10", "750200020031", 45.00, 68.00, "pza", 9, False, "pza", 0, 1.0, 0),
    ("Polvo Matizador Plata Aperlado 10g", "MAT-MAT-PLA10", "750200020032", 45.00, 68.00, "pza", 9, False, "pza", 0, 1.0, 0),
    ("Esencia de Vainilla Negra Deiman 120ml", "MAT-ESE-VAI120", "750200020033", 24.00, 36.00, "pza", 10, False, "pza", 0, 1.0, 0),
    ("Esencia de Vainilla Transparente Deiman 120ml", "MAT-ESE-VAIT120", "750200020034", 26.00, 38.00, "pza", 10, False, "pza", 0, 1.0, 0),
    ("Concentrado Sabor Nuez Deiman 120ml", "MAT-CON-NUE120", "750200020035", 35.00, 52.00, "pza", 10, False, "pza", 0, 1.0, 0),
    ("Concentrado Sabor Mantequilla Naranja Deiman 120ml", "MAT-CON-MAN120", "750200020036", 35.00, 52.00, "pza", 10, False, "pza", 0, 1.0, 0),
    ("Concentrado Sabor Café Moka Deiman 120ml", "MAT-CON-CAF120", "750200020037", 35.00, 52.00, "pza", 10, False, "pza", 0, 1.0, 0),

    # Moldes y Cortadores (subcat 11)
    ("Molde Redondo Aluminio para Pastel 20cm", "MAT-MOL-ALU20", "750200020038", 65.00, 95.00, "pza", 11, False, "pza", 0, 1.0, 0),
    ("Molde Redondo Aluminio para Pastel 24cm", "MAT-MOL-ALU24", "750200020039", 78.00, 115.00, "pza", 11, False, "pza", 0, 1.0, 0),
    ("Molde de Silicón para 12 Cupcakes", "MAT-MOL-SIL-CUP", "750200020040", 85.00, 125.00, "pza", 11, False, "pza", 0, 1.0, 0),
    ("Molde de Silicón Paletas Magnum 4 Cavidades", "MAT-MOL-SIL-MAG", "750200020041", 70.00, 105.00, "pza", 11, False, "pza", 0, 1.0, 0),
    ("Molde de Gelatina Rosca Fiesta 2lt", "MAT-MOL-GEL-ROS", "750200020042", 40.00, 60.00, "pza", 11, False, "pza", 0, 1.0, 0),
    ("Juego de Cortadores Galleta Figuras 6pz", "MAT-COR-FIG6P", "750200020043", 55.00, 82.00, "pza", 11, False, "pza", 0, 1.0, 0),
    ("Manga Pastelera Reutilizable de Silicón con 6 Duyas", "MAT-MAN-DUY6P", "750200020044", 75.00, 110.00, "pza", 11, False, "pza", 0, 1.0, 0),
    ("Espátula Escalonada de Acero Inoxidable 25cm", "MAT-ESP-ACE25", "750200020045", 48.00, 72.00, "pza", 11, False, "pza", 0, 1.0, 0),

    # Empaques, Cajas y Desechables (subcat 12 & extra)
    ("Caja para Pastel Redonda 25cm Paquete 10pz", "MAT-CAJ-PAS25-10", "750200020046", 95.00, 140.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Caja para Pastel Redonda 30cm Paquete 10pz", "MAT-CAJ-PAS30-10", "750200020047", 120.00, 175.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Caja para 6 Cupcakes con Ventana Paquete 10pz", "MAT-CAJ-CUP6-10", "750200020048", 85.00, 125.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Domo Desechable Alto para Pastel Paquete 5pz", "MAT-DOM-PAS5P", "750200020049", 55.00, 80.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Bolsa de Celofán 15x25cm Paquete 100pz", "MAT-BOL-CEL15-100", "750200020050", 35.00, 52.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Bolsa de Celofán 20x30cm Paquete 100pz", "MAT-BOL-CEL20-100", "750200020051", 45.00, 68.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Capacillo para Cupcake #72 Blanco Paquete 500pz", "MAT-CAP-72-500", "750200020052", 38.00, 58.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Capacillo para Cupcake #72 Diseños Fiesta 100pz", "MAT-CAP-72-DIS", "750200020053", 22.00, 35.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Base de Cartón Corrugado para Pastel 30cm Paquete 5pz", "MAT-BAS-CAR30-5", "750200020054", 45.00, 68.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Plato Pastelero Desechable Biodegradable Paquete 25pz", "MAT-PLA-PAS25", "750200020055", 28.00, 42.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Tenedor Pastelero Neón Paquete 50pz", "MAT-TEN-NEO50", "750200020056", 24.00, 36.00, "pza", 12, False, "pza", 0, 1.0, 0),
    ("Vaso Desechable 12oz Fiesta Paquete 50pz", "MAT-VAS-12OZ50", "750200020057", 32.00, 48.00, "pza", 12, False, "pza", 0, 1.0, 0)
]

# Regalos (target >= 50)
regalos_raw = [
    # Tazas y Termos (subcat 13 & 14)
    ("Taza Mágica Sensible al Calor 11oz", "REG-TAZ-MAG11", "750300030001", 45.00, 75.00, "pza", 13, False, "pza", 0, 1.0, 0),
    ("Taza Glitter Brillante Rosada 11oz", "REG-TAZ-GLI11", "750300030002", 50.00, 85.00, "pza", 13, False, "pza", 0, 1.0, 0),
    ("Taza Esmaltada Tipo Peltre Vintage", "REG-TAZ-PEL-VIN", "750300030003", 55.00, 90.00, "pza", 13, False, "pza", 0, 1.0, 0),
    ("Taza con Cuchara y Tapa Diseño Gato", "REG-TAZ-GAT-CUC", "750300030004", 70.00, 115.00, "pza", 13, False, "pza", 0, 1.0, 0),
    ("Termo de Acero Inoxidable Doble Pared 500ml", "REG-TER-ACE500", "750300030005", 95.00, 160.00, "pza", 14, False, "pza", 0, 1.0, 0),
    ("Termo Digital con Sensor de Temperatura 500ml", "REG-TER-DIG500", "750300030006", 110.00, 185.00, "pza", 14, False, "pza", 0, 1.0, 0),
    ("Termo Vaso Cafetero con Popote Metálico 750ml", "REG-TER-CAF750", "750300030007", 130.00, 210.00, "pza", 14, False, "pza", 0, 1.0, 0),
    ("Botella Motivacional para Agua 2 Litros con Marcador", "REG-BOT-MOT-2L", "750300030008", 85.00, 145.00, "pza", 14, False, "pza", 0, 1.0, 0),

    # Bolsas y Moños (subcat 15 & extra)
    ("Bolsa de Regalo Kraft Chica Diseños Surtidos", "REG-BOL-KRA-CH", "750300030009", 8.00, 15.00, "pza", 15, False, "pza", 0, 1.0, 0),
    ("Bolsa de Regalo Holográfica Mediana", "REG-BOL-HOL-MED", "750300030010", 14.00, 25.00, "pza", 15, False, "pza", 0, 1.0, 0),
    ("Bolsa de Regalo Grande Infantil Cumpleaños", "REG-BOL-GRA-INF", "750300030011", 18.00, 32.00, "pza", 15, False, "pza", 0, 1.0, 0),
    ("Bolsa de Regalo Jumbo para Peluche", "REG-BOL-JUM-PEL", "750300030012", 28.00, 50.00, "pza", 15, False, "pza", 0, 1.0, 0),
    ("Bolsa para Botella de Vino con Ventana", "REG-BOL-VIN-VEN", "750300030013", 16.00, 30.00, "pza", 15, False, "pza", 0, 1.0, 0),
    ("Papel de Regalo Couché Pliego Diseños Modernos", "REG-PAP-COU-PLI", "750300030014", 5.00, 10.00, "pza", 15, False, "pza", 0, 1.0, 0),
    ("Papel China de Colores Paquete 10 Pliegos", "REG-PAP-CHI-10P", "750300030015", 12.00, 22.00, "pza", 15, False, "pza", 0, 1.0, 0),
    ("Moño Mágico Metálico Mediano Paquete 10pz", "REG-MON-MAG-MED", "750300030016", 15.00, 28.00, "pza", 15, False, "pza", 0, 1.0, 0),
    ("Moño Pompon Gigante para Regalo", "REG-MON-POM-GIG", "750300030017", 18.00, 35.00, "pza", 15, False, "pza", 0, 1.0, 0),
    ("Listón Celiseda 50m Rollo Colores Surtidos", "REG-LIS-CEL-50M", "750300030018", 25.00, 45.00, "pza", 15, False, "pza", 0, 1.0, 0),

    # Peluches y Novedades (subcat 16 & extra)
    ("Oso de Peluche Clásico con Corazón 30cm", "REG-PEL-OSO-COR", "750300030019", 110.00, 190.00, "pza", 16, False, "pza", 0, 1.0, 0),
    ("Oso de Peluche Gigante 1 Metro Suave", "REG-PEL-OSO-1MT", "750300030020", 380.00, 650.00, "pza", 16, False, "pza", 0, 1.0, 0),
    ("Peluche Unicornio Arcoíris con Luz LED 40cm", "REG-PEL-UNI-LED", "750300030021", 160.00, 270.00, "pza", 16, False, "pza", 0, 1.0, 0),
    ("Peluche Aguacate Kawaii 25cm", "REG-PEL-AGU-KAW", "750300030022", 75.00, 130.00, "pza", 16, False, "pza", 0, 1.0, 0),
    ("Peluche Stitch Azul Ojos Grandes 35cm", "REG-PEL-STI-AZU", "750300030023", 140.00, 240.00, "pza", 16, False, "pza", 0, 1.0, 0),
    ("Peluche Capibara con Mochila Tortuga 30cm", "REG-PEL-CAP-MOC", "750300030024", 130.00, 220.00, "pza", 16, False, "pza", 0, 1.0, 0),
    ("Llavero Peluche Minions Diseños Surtidos", "REG-LLA-PEL-MIN", "750300030025", 25.00, 45.00, "pza", 16, False, "pza", 0, 1.0, 0),
    ("Juguete Burbujero Gigante Infantil", "REG-JUG-BUR-GIG", "750300030026", 20.00, 38.00, "pza", 16, False, "pza", 0, 1.0, 0),
    ("Slime Galáctico con Glitter Frasco 150g", "REG-SLI-GAL-150", "750300030027", 18.00, 35.00, "pza", 16, False, "pza", 0, 1.0, 0),
    ("Pop It Antiestrés Figuras Variadas", "REG-POP-ANT-FIG", "750300030028", 22.00, 40.00, "pza", 16, False, "pza", 0, 1.0, 0),

    # Globos (subcat 17)
    ("Globo Metálico Número '0' Dorado 80cm", "REG-GLO-NUM-0-DOR", "750300030029", 18.00, 35.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo Metálico Número '1' Dorado 80cm", "REG-GLO-NUM-1-DOR", "750300030030", 18.00, 35.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo Metálico Número '2' Dorado 80cm", "REG-GLO-NUM-2-DOR", "750300030031", 18.00, 35.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo Metálico Número '3' Dorado 80cm", "REG-GLO-NUM-3-DOR", "750300030032", 18.00, 35.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo Metálico Número '5' Dorado 80cm", "REG-GLO-NUM-5-DOR", "750300030033", 18.00, 35.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo Metálico Feliz Cumpleaños Redondo 18 pulg", "REG-GLO-FC-RED18", "750300030034", 12.00, 25.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo Metálico Corazón Te Amo Rojo 18 pulg", "REG-GLO-COR-TEA18", "750300030035", 12.00, 25.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo Metálico Estrella Oro Rosa 18 pulg", "REG-GLO-EST-ORO18", "750300030036", 12.00, 25.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo de Látex Cromado Metálico Paquete 25pz", "REG-GLO-LAT-CRO25", "750300030037", 35.00, 60.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo de Látex Pastel Macarrón #9 Paquete 50pz", "REG-GLO-LAT-PAS50", "750300030038", 40.00, 70.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Globo Burbuja Transparente Bobo 24 pulg", "REG-GLO-BUR-BOB24", "750300030039", 22.00, 45.00, "pza", 17, False, "pza", 0, 1.0, 0),
    ("Kit Arco de Globos Orgánico 100 Piezas Guirnalda", "REG-KIT-ARC-GLO100", "750300030040", 110.00, 195.00, "pza", 17, False, "pza", 0, 1.0, 0),

    # Velas (subcat 18)
    ("Vela Chispero Pirotécnica Pastel Fría 15cm", "REG-VEL-CHI-PAS15", "750300030041", 12.00, 25.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Vela Chispero Pirotécnica Pastel Jumbo 25cm", "REG-VEL-CHI-JUM25", "750300030042", 18.00, 35.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Vela de Número Metálica con Glitter '0 al 9'", "REG-VEL-NUM-GLI", "750300030043", 10.00, 20.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Vela Tradicional Espiral Multicolor Paquete 24pz", "REG-VEL-ESP-MUL24", "750300030044", 15.00, 28.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Vela Mágica No Se Apaga Paquete 10pz", "REG-VEL-MAG-NOA10", "750300030045", 14.00, 26.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Vela Aromática Decorativa en Vaso de Vidrio Vainilla", "REG-VEL-ARO-VID-VAI", "750300030046", 45.00, 80.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Vela Letrero 'Happy Birthday' Letras Multicolor", "REG-VEL-LET-HBD", "750300030047", 22.00, 42.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Corona Tiara Cumpleañera con Luces LED", "REG-COR-TIA-HBD", "750300030048", 30.00, 55.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Banda Satinada 'Birthday Girl / Queen'", "REG-BAN-SAT-BDG", "750300030049", 25.00, 48.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Confeti Metálico Multicolor Bolsa 100g", "REG-CON-MET-100", "750300030050", 12.00, 22.00, "pza", 18, False, "pza", 0, 1.0, 0),
    ("Espuma en Aerosol Serpentina Loca Bote 250ml", "REG-ESP-AER-SER250", "750300030051", 20.00, 38.00, "pza", 18, False, "pza", 0, 1.0, 0)
]

sql_lines = []
sql_lines.append("-- ==========================================================")
sql_lines.append("-- 05_massive_test_data.sql")
sql_lines.append("-- Generación masiva de datos sintéticos realistas para Ferizamart (a001)")
sql_lines.append("-- ==========================================================\n")

sql_lines.append("BEGIN;\n")

# Extra users
sql_lines.append("-- 1. Extra Users")
extra_users = [
    ("Cajera Vespertina Ana Martínez", "vendedor2@ferizamart.com", "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", "vendedor", "5511223344"),
    ("Supervisor Roberto Sánchez", "supervisor@ferizamart.com", "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", "gerente", "5566778899")
]
for u in extra_users:
    sql_lines.append(f"INSERT INTO users (name, email, password, role, phone) VALUES ({escape_sql(u[0])}, {escape_sql(u[1])}, {escape_sql(u[2])}, '{u[3]}', {escape_sql(u[4])}) ON CONFLICT (email) DO NOTHING;")

# Extra subcategories
sql_lines.append("\n-- 2. Extra Subcategories")
for sc in extra_subcategories:
    sql_lines.append(f"INSERT INTO subcategories (category_id, name, slug, description) VALUES ({sc[0]}, {escape_sql(sc[1])}, {escape_sql(sc[2])}, {escape_sql(sc[3])}) ON CONFLICT (slug) DO NOTHING;")

# Products
sql_lines.append("\n-- 3. Products Insertion (Dulcería, Materias Primas, Regalos)")
all_products_raw = dulceria_raw + materias_raw + regalos_raw

for p in all_products_raw:
    name, sku, barcode, cost, sale, unit, subcat_id, is_bulk, b_unit, b_price, pkg_content, b_stock = p
    margin_val = round(((sale - cost) / cost) * 100, 2)
    sql_lines.append(f"""INSERT INTO products (subcategory_id, name, sku, barcode, purchase_price, margin_type, margin_value, sale_price, min_stock, unit, is_bulk_enabled, bulk_unit, bulk_price, package_content, bulk_stock)
VALUES ({subcat_id}, {escape_sql(name)}, {escape_sql(sku)}, {escape_sql(barcode)}, {cost}, 'percentage', {margin_val}, {sale}, 10, '{unit}', {escape_sql(is_bulk)}, '{b_unit}', {b_price}, {pkg_content}, {b_stock})
ON CONFLICT (sku) DO UPDATE SET 
    sale_price = EXCLUDED.sale_price,
    purchase_price = EXCLUDED.purchase_price,
    is_bulk_enabled = EXCLUDED.is_bulk_enabled,
    bulk_price = EXCLUDED.bulk_price,
    bulk_stock = EXCLUDED.bulk_stock;""")

# Services (Catalog)
sql_lines.append("\n-- 4. Expanded Services Catalog")
services_data = [
    ("Inflado de Globo Látex con Helio R9", "Inflado con helio puro para globos del #9, incluye listón celiseda", "globos_helio", "fijo", 18.00),
    ("Inflado de Globo Metálico 18 pulg con Helio", "Inflado con helio puro para globos metálicos estándar, incluye contrapeso", "globos_helio", "fijo", 35.00),
    ("Inflado de Globo Gigante / Número Foil con Helio", "Inflado para figuras y números gigantes con helio de alta pureza", "globos_helio", "fijo", 70.00),
    ("Envoltura Express Caja Chica", "Papel temático, moño artesanal y tarjeta para regalos chicos", "envolturas", "fijo", 25.00),
    ("Envoltura Premium Canasta o Caja Grande", "Arreglo con celofán, moño pompon grande, relleno de papel china y dedicatoria", "envolturas", "variable", 60.00),
    ("Impresión de Oblea Comestible Arroz Carta", "Impresión en papel de arroz con tintas vegetales certificadas", "impresion_transfer", "fijo", 65.00),
    ("Impresión de Hoja de Azúcar Carta Premium", "Impresión de alta resolución en hoja de azúcar flexible para pastelería fina", "impresion_transfer", "fijo", 95.00),
    ("Impresión de Transfer para Gelatina Carta", "Hoja transfer comestible especial para transferir imágenes a gelatinas", "impresion_transfer", "fijo", 55.00),
    ("Personalización con Vinil de Corte Nombre/Frase", "Corte y aplicación de vinil adhesivo en tazas, botellas o termos", "otro", "variable", 35.00),
    ("Armado de Mesa de Dulces / Candy Bar Básico", "Montaje y acomodo de dulcería en recipientes y bases temáticas", "otro", "variable", 500.00),
    ("Renta de Base para Pastel / Donas / Cupcakes", "Renta por evento de estructura exhibidora (depósito requerido)", "otro", "fijo", 150.00)
]

for s in services_data:
    sql_lines.append(f"""INSERT INTO services (name, description, category, price_type, base_price)
VALUES ({escape_sql(s[0])}, {escape_sql(s[1])}, '{s[2]}', '{s[3]}', {s[4]})
ON CONFLICT DO NOTHING;""")

# Packages / Combos
sql_lines.append("\n-- 5. Expanded Packages / Combos Piñateros")
packages_data = [
    ("Combo Piñatero Básico 15 Niños", "PAQ-PIN-15P", "Selección equilibrada de paletas, chicles, bombones y bolsitas para 15 pequeños", 219.00, 15),
    ("Combo Fiesta Infantil 30 Personas", "PAQ-PIN-30P", "Surtido amplio de chocolates, gomitas, dulces enchilados y botanas para 30 niños", 429.00, 30),
    ("Combo Mega Fiesta Piñata 50 Personas", "PAQ-PIN-50P-PLUS", "Paquete completo con más de 300 piezas de dulces surtidos y bolsas de regalo", 729.00, 50),
    ("Combo Fiesta Escolar 40 Personas", "PAQ-PIN-40P", "Paquete con dulces individuales no pegajosos y fácil reparto para escuelas", 549.00, 40),
    ("Kit Repostería Básico Cupcakes", "KIT-REP-CUP-BAS", "Incluye harina preparada, capacillos, duyas, colorantes y granillo", 189.00, 12),
    ("Kit Fiesta Globos y Chisperos Cumpleaños", "KIT-FIE-GLO-VEL", "Kit con chispero jumbo, 2 globos metálicos, 10 globos látex y serpentinas", 149.00, 10),
    ("Combo Candy Bar Dulce y Enchilado", "PAQ-CAN-BAR-MIX", "Variedad a granel de gomitas, mangos enchilados, chicharrines y chocolates", 380.00, 25),
    ("Kit Regalo Sorpresa con Peluche y Taza", "KIT-REG-PEL-TAZ", "Oso de peluche con taza decorada, chocolates kisses y envoltura de celofán", 279.00, 1)
]

for pkg in packages_data:
    sql_lines.append(f"""INSERT INTO packages (name, sku, description, price, capacity_people)
VALUES ({escape_sql(pkg[0])}, '{pkg[1]}', {escape_sql(pkg[2])}, {pkg[3]}, {pkg[4]})
ON CONFLICT (sku) DO NOTHING;""")

# Package Items
sql_lines.append("\n-- 6. Package Components (package_items)")
pkg_items_mapping = [
    ("PAQ-PIN-15P", [("PAL-TUT-CLA40", 1), ("CHI-BUB-MOR50", 1), ("ENC-PUL-ORI20", 1), ("REG-BOL-KRA-CH", 15)]),
    ("PAQ-PIN-30P", [("PAL-VER-MAN40", 1), ("CHO-BOC-DIS50", 1), ("GOM-PAN-CLA1K", 1), ("CHI-CAN-SUR60", 1), ("REG-BOL-GRA-INF", 30)]),
    ("PAQ-PIN-50P-PLUS", [("PAL-TUT-BOT40", 2), ("CHO-CAR-DIS24", 2), ("GOM-OSI-DUL1K", 2), ("ENC-ROC-SON30", 2), ("MAT-BOL-CEL15-100", 1)]),
    ("KIT-REP-CUP-BAS", [("MAT-HAR-PAS-VAI", 1), ("MAT-CAP-72-DIS", 1), ("MAT-COL-ROJ40", 1), ("MAT-GRA-COL1K", 0.25)]),
    ("KIT-FIE-GLO-VEL", [("REG-VEL-CHI-JUM25", 1), ("REG-GLO-FC-RED18", 2), ("REG-GLO-LAT-CRO25", 1), ("REG-ESP-AER-SER250", 2)]),
    ("KIT-REG-PEL-TAZ", [("REG-PEL-OSO-COR", 1), ("REG-TAZ-MAG11", 1), ("CHO-BOC-DIS50", 0.2), ("REG-BOL-HOL-MED", 1)])
]

for p_sku, items in pkg_items_mapping:
    for pr_sku, qty in items:
        sql_lines.append(f"""INSERT INTO package_items (package_id, product_id, quantity, unit)
SELECT p.id, pr.id, {qty}, 'pza' 
FROM packages p, products pr 
WHERE p.sku = '{p_sku}' AND pr.sku = '{pr_sku}'
ON CONFLICT DO NOTHING;""")

# Product Batches
sql_lines.append("\n-- 7. Batches (product_batches) - Semáforo (Rojo, Naranja, Amarillo, Verde, Pasados)")
for i, p in enumerate(all_products_raw, 1):
    p_sku = p[1]
    batch_num_hist = f"LOT-H{2024}-{i:03d}"
    sql_lines.append(f"""INSERT INTO product_batches (product_id, batch_number, quantity, quantity_sold, expiration_date, received_date, notes, is_active)
SELECT id, '{batch_num_hist}', 100, 100, '2025-06-30'::DATE, '2024-01-15'::DATE, 'Lote histórico liquidado', false
FROM products WHERE sku = '{p_sku}' ON CONFLICT (batch_number) DO NOTHING;""")

    rot = i % 4
    if rot == 0:
        days = random.randint(8, 26)
        b_code = f"LOT-R26-{i:03d}"
        notes = "LOTE EN SEMÁFORO ROJO - PRIORIDAD REMATE"
    elif rot == 1:
        days = random.randint(32, 55)
        b_code = f"LOT-O26-{i:03d}"
        notes = "LOTE EN SEMÁFORO NARANJA - PROMOCIÓN ACTIVA"
    elif rot == 2:
        days = random.randint(62, 85)
        b_code = f"LOT-Y26-{i:03d}"
        notes = "LOTE EN SEMÁFORO AMARILLO - MONITOREO"
    else:
        days = random.randint(120, 360)
        b_code = f"LOT-G27-{i:03d}"
        notes = "LOTE EN SEMÁFORO VERDE - VENTA NORMAL"

    total_qty = random.randint(40, 150)
    sold_qty = random.randint(0, int(total_qty * 0.4))
    sql_lines.append(f"""INSERT INTO product_batches (product_id, batch_number, quantity, quantity_sold, expiration_date, received_date, notes, is_active)
SELECT id, '{b_code}', {total_qty}, {sold_qty}, (CURRENT_DATE + INTERVAL '{days} days')::DATE, (CURRENT_DATE - INTERVAL '30 days')::DATE, '{notes}', true
FROM products WHERE sku = '{p_sku}' ON CONFLICT (batch_number) DO NOTHING;""")

    if i % 2 == 0:
        b_code_fresh = f"LOT-F27-{i:03d}"
        days_fresh = random.randint(180, 450)
        sql_lines.append(f"""INSERT INTO product_batches (product_id, batch_number, quantity, quantity_sold, expiration_date, received_date, notes, is_active)
SELECT id, '{b_code_fresh}', 120, 5, (CURRENT_DATE + INTERVAL '{days_fresh} days')::DATE, CURRENT_DATE, 'Lote fresco de reabastecimiento', true
FROM products WHERE sku = '{p_sku}' ON CONFLICT (batch_number) DO NOTHING;""")

# Fraction prices & wholesale tiers
sql_lines.append("\n-- 8. Wholesale Tiers and Fraction Prices")
bulk_skus = [p[1] for p in all_products_raw if p[7]]
for b_sku in bulk_skus[:15]:
    sql_lines.append(f"""INSERT INTO product_fraction_prices (product_id, name, fraction_multiplier, price)
SELECT id, '1 Kilo Completo', 1.000, sale_price FROM products WHERE sku = '{b_sku}' ON CONFLICT DO NOTHING;
INSERT INTO product_fraction_prices (product_id, name, fraction_multiplier, price)
SELECT id, '1/2 Kilo (500g)', 0.500, ROUND(sale_price * 0.54, 2) FROM products WHERE sku = '{b_sku}' ON CONFLICT DO NOTHING;
INSERT INTO product_fraction_prices (product_id, name, fraction_multiplier, price)
SELECT id, '1/4 Kilo (250g)', 0.250, ROUND(sale_price * 0.28, 2) FROM products WHERE sku = '{b_sku}' ON CONFLICT DO NOTHING;
INSERT INTO product_fraction_prices (product_id, name, fraction_multiplier, price)
SELECT id, '100 Gramos', 0.100, ROUND(sale_price * 0.12, 2) FROM products WHERE sku = '{b_sku}' ON CONFLICT DO NOTHING;
""")

for p in all_products_raw[:25]:
    p_sku = p[1]
    sql_lines.append(f"""INSERT INTO product_wholesale_tiers (product_id, min_quantity, wholesale_price)
SELECT id, 10, ROUND(sale_price * 0.82, 2) FROM products WHERE sku = '{p_sku}' ON CONFLICT DO NOTHING;
INSERT INTO product_wholesale_tiers (product_id, min_quantity, wholesale_price)
SELECT id, 25, ROUND(sale_price * 0.75, 2) FROM products WHERE sku = '{p_sku}' ON CONFLICT DO NOTHING;
""")

# Custom Orders
sql_lines.append("\n-- 9. Custom Orders (Pedidos Especiales 2023 - 2026)")
order_templates = [
    ("Oblea de arroz personalizada circular 20cm motivo Frozen con foto", 85.00, 45.00),
    ("Transfer para gelatina tamaño carta motivo Mario Bros y nombre 'Santiago - 5 Años'", 65.00, 65.00),
    ("Hoja de azúcar calidad fotográfica para pastel de bodas floral", 120.00, 60.00),
    ("Arreglo bouquet de 15 globos con helio y chocolates Ferrero para Aniversario", 520.00, 250.00),
    ("Centro de mesa piñatero temático de Dinosaurios con surtido de golosinas", 280.00, 150.00),
    ("Lote de 20 tazas personalizadas con logotipo empresarial para evento corporativo", 1400.00, 700.00),
    ("Termo grabado con vinil térmico y caja decorativa para regalo de maestro", 220.00, 100.00),
    ("Kit de 50 bolsitas de dulces personalizadas con etiqueta Bautizo", 850.00, 400.00),
    ("Oblea comestible diseño Spiderman con texto 'Feliz Cumpleaños Ian'", 65.00, 65.00),
    ("Arreglo de oso de peluche gigante 1m con 5 globos de helio y chocolates", 890.00, 400.00)
]

names_pool = [
    "Patricia Morales", "Ricardo Garza", "Laura Domínguez", "Héctor Valenzuela", "Gabriela Ochoa",
    "Esteban Navarro", "Mariana Fuentes", "Alejandro Ríos", "Claudia Salgado", "Fernando Medina",
    "Sofía Cárdenas", "Javier Bustamante", "Daniela Coronado", "Ignacio Barajas", "Verónica Espinoza",
    "Hugo Santillán", "Teresa Alarcón", "Diego Becerra", "Adriana Villegas", "Rodrigo Rivas"
]

start_date_co = datetime.date(2023, 2, 10)
end_date_co = datetime.date(2026, 9, 2)
total_days_co = (end_date_co - start_date_co).days

for ord_idx in range(1, 61):
    day_offset = int((ord_idx / 60.0) * total_days_co)
    ord_date = start_date_co + datetime.timedelta(days=day_offset)
    req_date = ord_date + datetime.timedelta(days=random.randint(2, 6))
    
    if ord_date < datetime.date(2026, 7, 1):
        status = random.choices(['entregado', 'cancelado_reembolso', 'cancelado_cambio'], weights=[92, 5, 3])[0]
    else:
        status = random.choices(['pendiente', 'en_proceso', 'listo', 'entregado'], weights=[35, 30, 20, 15])[0]

    template = random.choice(order_templates)
    desc = template[0]
    total_amt = template[1] + random.randint(0, 4) * 15.0
    dep_amt = template[2]
    if status == 'entregado':
        dep_amt = total_amt
        pend_bal = 0.0
    else:
        pend_bal = total_amt - dep_amt

    order_num = f"PED-{ord_date.strftime('%Y%m%d')}-{ord_idx:03d}"
    cust_name = random.choice(names_pool)
    cust_phone = f"55{random.randint(10000000, 99999999)}"
    cust_email = f"{cust_name.lower().replace(' ', '.')}@gmail.com"

    sql_lines.append(f"""INSERT INTO custom_orders (order_number, user_id, customer_name, customer_phone, customer_email, description, required_date, total, deposit_amount, pending_balance, status, created_at, updated_at)
VALUES ('{order_num}', (SELECT id FROM users ORDER BY random() LIMIT 1), {escape_sql(cust_name)}, '{cust_phone}', '{cust_email}', {escape_sql(desc)}, '{req_date} 15:00:00'::TIMESTAMP, {total_amt}, {dep_amt}, {pend_bal}, '{status}', '{ord_date} 10:30:00'::TIMESTAMP, '{ord_date} 10:30:00'::TIMESTAMP)
ON CONFLICT (order_number) DO NOTHING;""")

# Layaways
sql_lines.append("\n-- 10. Layaways / Apartados & Payments (2023 - 2026)")
for lay_idx in range(1, 61):
    day_offset = int((lay_idx / 60.0) * total_days_co)
    lay_date = start_date_co + datetime.timedelta(days=day_offset)
    exp_date = lay_date + datetime.timedelta(days=30)
    grace_date = exp_date + datetime.timedelta(days=10)

    if lay_date < datetime.date(2026, 6, 1):
        status = random.choices(['liquidado', 'entregado', 'vencido', 'cancelado'], weights=[55, 35, 7, 3])[0]
    else:
        status = random.choices(['activo', 'gracia_10_dias', 'liquidado', 'entregado'], weights=[50, 20, 15, 15])[0]

    folio = f"APT-{lay_date.strftime('%Y%m%d')}-{lay_idx:03d}"
    cust_name = random.choice(names_pool)
    cust_phone = f"55{random.randint(10000000, 99999999)}"
    cust_email = f"{cust_name.lower().replace(' ', '.')}@hotmail.com"

    tot_amount = float(random.randint(400, 2500))
    init_dep = round(tot_amount * random.uniform(0.25, 0.40), 2)
    
    if status in ['liquidado', 'entregado']:
        paid_amt = tot_amount
        rem_bal = 0.0
    elif status in ['activo', 'gracia_10_dias', 'vencido']:
        extra_pay = round((tot_amount - init_dep) * random.uniform(0.0, 0.6), 2)
        paid_amt = init_dep + extra_pay
        rem_bal = tot_amount - paid_amt
    else:
        paid_amt = init_dep
        rem_bal = tot_amount - init_dep

    sql_lines.append(f"""INSERT INTO layaways (folio, user_id, customer_name, customer_phone, customer_email, total_amount, initial_deposit, total_paid, remaining_balance, start_date, expiration_date, grace_period_end_date, status, created_at, updated_at)
VALUES ('{folio}', (SELECT id FROM users ORDER BY random() LIMIT 1), {escape_sql(cust_name)}, '{cust_phone}', '{cust_email}', {tot_amount}, {init_dep}, {paid_amt}, {rem_bal}, '{lay_date}'::DATE, '{exp_date}'::DATE, '{grace_date}'::DATE, '{status}', '{lay_date} 11:00:00'::TIMESTAMP, '{lay_date} 11:00:00'::TIMESTAMP)
ON CONFLICT (folio) DO NOTHING;""")

    sample_prod = random.choice(all_products_raw)
    prod_sku = sample_prod[1]
    prod_price = sample_prod[4]
    item_qty = max(1, int(round(tot_amount / prod_price)))
    item_sub = round(item_qty * prod_price, 2)

    sql_lines.append(f"""INSERT INTO layaway_items (layaway_id, product_id, product_name, quantity, unit_price, subtotal)
SELECT l.id, p.id, p.name, {item_qty}, {prod_price}, {item_sub}
FROM layaways l, products p 
WHERE l.folio = '{folio}' AND p.sku = '{prod_sku}'
ON CONFLICT DO NOTHING;""")

    rec_num_1 = f"ABN-{lay_date.strftime('%Y%m%d')}-{lay_idx:03d}-1"
    sql_lines.append(f"""INSERT INTO layaway_payments (layaway_id, user_id, receipt_number, amount, payment_method, previous_balance, new_balance, notes, created_at)
SELECT l.id, l.user_id, '{rec_num_1}', {init_dep}, 'efectivo', {tot_amount}, {round(tot_amount - init_dep, 2)}, 'Anticipo inicial para apartado', '{lay_date} 11:05:00'::TIMESTAMP
FROM layaways l WHERE l.folio = '{folio}'
ON CONFLICT (receipt_number) DO NOTHING;""")

    if paid_amt > init_dep:
        rec_num_2 = f"ABN-{lay_date.strftime('%Y%m%d')}-{lay_idx:03d}-2"
        pay2_amt = round(paid_amt - init_dep, 2)
        pay2_date = lay_date + datetime.timedelta(days=random.randint(5, 20))
        sql_lines.append(f"""INSERT INTO layaway_payments (layaway_id, user_id, receipt_number, amount, payment_method, previous_balance, new_balance, notes, created_at)
SELECT l.id, l.user_id, '{rec_num_2}', {pay2_amt}, 'tarjeta', {round(tot_amount - init_dep, 2)}, {rem_bal}, 'Abono intermedio / Liquidación', '{pay2_date} 16:30:00'::TIMESTAMP
FROM layaways l WHERE l.folio = '{folio}'
ON CONFLICT (receipt_number) DO NOTHING;""")

# 11. SALES & TICKETS (>1,150 real sales from 2023-01-05 to 2026-09-02)
sql_lines.append("\n-- 11. Massive Sales & Tickets (>1,150 Records spanning 2023 to 2026)")

sales_start = datetime.date(2023, 1, 5)
sales_end = datetime.date(2026, 9, 2)
total_sales_to_gen = 1180

pay_methods = ['efectivo', 'tarjeta', 'transferencia']
pay_weights = [68, 24, 8]
item_types_pool = ['producto', 'producto', 'producto', 'granel', 'paquete', 'servicio']

sales_per_day = {}
current_d = sales_start
while current_d <= sales_end:
    sales_per_day[current_d] = 0
    current_d += datetime.timedelta(days=1)

all_days = list(sales_per_day.keys())
weights = []
for d in all_days:
    w = 1.0
    if d.month == 12:
        w = 2.8
    elif d.month == 4 and d.day >= 20:
        w = 2.5
    elif d.month == 10 and d.day >= 20:
        w = 2.4
    elif d.month == 2 and 10 <= d.day <= 15:
        w = 2.2
    elif d.month == 1 and d.day <= 6:
        w = 2.0
    elif d.month == 5 and 5 <= d.day <= 10:
        w = 1.8
    elif d.weekday() in [4, 5]:
        w *= 1.4
    weights.append(w)

chosen_days = random.choices(all_days, weights=weights, k=total_sales_to_gen)
chosen_days.sort()

day_counter = {}

for sale_global_idx, sale_day in enumerate(chosen_days, 1):
    day_str = sale_day.strftime('%Y%m%d')
    day_counter[day_str] = day_counter.get(day_str, 0) + 1
    t_num = f"T-{day_str}-{day_counter[day_str]:03d}"
    
    hour = random.randint(9, 20)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    sale_timestamp = f"{sale_day.strftime('%Y-%m-%d')} {hour:02d}:{minute:02d}:{second:02d}"

    user_expr = "(SELECT id FROM users ORDER BY random() LIMIT 1)"
    p_method = random.choices(pay_methods, weights=pay_weights)[0]
    status = 'cancelada' if random.random() < 0.035 else 'completada'
    
    num_items = random.choices([1, 2, 3, 4, 5], weights=[35, 30, 20, 10, 5])[0]
    
    items_sql = []
    running_subtotal = 0.0

    for _ in range(num_items):
        i_type = random.choice(item_types_pool)
        if i_type == 'producto':
            prod = random.choice(all_products_raw)
            p_sku = prod[1]
            p_name = prod[0]
            unit_p = prod[4]
            qty = random.randint(1, 4)
            line_sub = round(unit_p * qty, 2)
            running_subtotal += line_sub
            items_sql.append(f"""INSERT INTO sale_details (sale_id, item_type, product_id, product_name, unit_price, quantity, subtotal, created_at)
SELECT currval('sales_id_seq'), 'producto', p.id, {escape_sql(p_name)}, {unit_p}, {qty}, {line_sub}, '{sale_timestamp}'::TIMESTAMP
FROM products p WHERE p.sku = '{p_sku}';""")

        elif i_type == 'granel':
            bulk_prods = [p for p in all_products_raw if p[7]]
            if bulk_prods:
                prod = random.choice(bulk_prods)
                p_sku = prod[1]
                p_name = f"[Granel] {prod[0]}"
                unit_p = prod[9] if prod[9] > 0 else prod[4]
                qty = round(random.choice([0.250, 0.500, 0.750, 1.000, 1.500]), 3)
                line_sub = round(unit_p * qty, 2)
                running_subtotal += line_sub
                items_sql.append(f"""INSERT INTO sale_details (sale_id, item_type, product_id, product_name, unit_price, quantity, subtotal, created_at)
SELECT currval('sales_id_seq'), 'granel', p.id, {escape_sql(p_name)}, {unit_p}, {qty}, {line_sub}, '{sale_timestamp}'::TIMESTAMP
FROM products p WHERE p.sku = '{p_sku}';""")

        elif i_type == 'paquete':
            pkg = random.choice(packages_data)
            pkg_sku = pkg[1]
            pkg_name = f"[Combo] {pkg[0]}"
            unit_p = pkg[3]
            qty = 1
            line_sub = unit_p
            running_subtotal += line_sub
            items_sql.append(f"""INSERT INTO sale_details (sale_id, item_type, package_id, product_name, unit_price, quantity, subtotal, created_at)
SELECT currval('sales_id_seq'), 'paquete', pk.id, {escape_sql(pkg_name)}, {unit_p}, {qty}, {line_sub}, '{sale_timestamp}'::TIMESTAMP
FROM packages pk WHERE pk.sku = '{pkg_sku}';""")

        elif i_type == 'servicio':
            serv = random.choice(services_data)
            serv_name = f"[Servicio] {serv[0]}"
            unit_p = serv[4]
            qty = random.randint(1, 3)
            line_sub = round(unit_p * qty, 2)
            running_subtotal += line_sub
            items_sql.append(f"""INSERT INTO sale_details (sale_id, item_type, service_id, product_name, unit_price, quantity, subtotal, created_at)
SELECT currval('sales_id_seq'), 'servicio', s.id, {escape_sql(serv_name)}, {unit_p}, {qty}, {line_sub}, '{sale_timestamp}'::TIMESTAMP
FROM services s WHERE s.name = {escape_sql(serv[0])} LIMIT 1;""")

    tax_val = round(running_subtotal * 0.16, 2)
    disc_val = 0.0
    if running_subtotal > 300 and random.random() < 0.15:
        disc_val = round(running_subtotal * 0.05, 2)
    total_val = round(running_subtotal + tax_val - disc_val, 2)

    note_text = "Venta POS Mostrador" if status == 'completada' else "Venta Cancelada por Cliente"
    
    sql_lines.append(f"""INSERT INTO sales (user_id, ticket_number, subtotal, tax, discount, total, payment_method, status, notes, created_at)
VALUES ({user_expr}, '{t_num}', {running_subtotal}, {tax_val}, {disc_val}, {total_val}, '{p_method}', '{status}', '{note_text}', '{sale_timestamp}'::TIMESTAMP);""")

    for itm in items_sql:
        sql_lines.append(itm)

    t_status = 'generado' if status == 'completada' else 'error'
    sent_v = random.choice(['print', 'whatsapp', 'email', 'none'])
    sent_t = "5512345678" if sent_v == 'whatsapp' else ("cliente@gmail.com" if sent_v == 'email' else None)
    sql_lines.append(f"""INSERT INTO tickets (sale_id, ticket_number, sent_via, sent_to, status, created_at)
VALUES (currval('sales_id_seq'), '{t_num}', '{sent_v}', {escape_sql(sent_t)}, '{t_status}', '{sale_timestamp}'::TIMESTAMP);""")

# Audit Log sample
sql_lines.append("\n-- 12. Audit Logs Sample")
audit_samples = [
    (1, "LOGIN", "auth", 1, '{"action": "successful_login"}', "192.168.1.10"),
    (1, "CREATE", "product", 15, '{"sku": "CHI-TRI-MEN18", "sale_price": 24.00}', "192.168.1.10"),
    (2, "STATUS_UPDATE", "custom_order", 1, '{"status": "en_proceso"}', "192.168.1.15"),
    (1, "RECEIVE_BATCH", "product_batches", 10, '{"batch_number": "LOT-G27-010", "quantity": 100}', "192.168.1.10")
]
for al in audit_samples:
    sql_lines.append(f"""INSERT INTO audit_log (user_id, action, entity, entity_id, new_values, ip_address, created_at)
VALUES ({al[0]}, '{al[1]}', '{al[2]}', {al[3]}, '{al[4]}'::JSONB, '{al[5]}'::INET, NOW() - INTERVAL '1 day');""")

sql_lines.append("\nCOMMIT;\n")

# Write to file
target_path = "/Users/fernandoizazaga/Desktop/Proyectos/dev-ferizamart97/somosim/clientes/a001/apa001/database/migrations/05_massive_test_data.sql"
with open(target_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print(f"Successfully generated {len(sql_lines)} lines of SQL to {target_path}")
print(f"Total Products: {len(all_products_raw)}")
print(f"Total Sales/Tickets: {total_sales_to_gen}")
