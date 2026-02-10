import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const connectionString = `postgresql://${process.env['POSTGRES_USER']}:${process.env['POSTGRES_PASSWORD']}@${process.env['POSTGRES_HOST']}:${process.env['POSTGRES_PORT']}/${process.env['POSTGRES_DB']}`;

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {

    console.log('SEED');

    let lastCategory = await prisma.category.create({
        data: {
            name: 'МОДУЛЬНЫЕ ДОМА  ВЫХОДНОГО ДНЯ',
            slug: 'modulnyye-doma-vykhodnogo-dnya'
        }
    });

    lastCategory = await prisma.category.create({
        data: {
            name: 'МОДУЛЬНАЯ САДОВАЯ АРХИТЕКТУРА',
            slug: 'modulnaya-sadovaya-arkhitektura'
        }
    });

    lastCategory = await prisma.category.create({
        data: {
            name: 'СЕРИЯ САДОВОЙ АРХИТЕКТУРЫ В СКАНДИНАВСКОМ СТИЛЕ',
            slug: 'seriya-sadovoy-arkhitektury-v-skandinavskom-stile'
        }
    });

    lastCategory = await prisma.category.create({
        data: {
            name: 'САДОВАЯ МЕБЕЛЬ ДЛЯ БЕСЕДОК И ТЕРРАС',
            slug: 'sadovaya-mebel-dlya-besedok-i-terras'
        }
    });

    let lastId = lastCategory.id;

    lastCategory = await prisma.category.create({
        data: {
            name: 'Модель Ute',
            description: 'Модель Ute это садовая мебель из  массива сосны  (клееный брус)  для использования в закрытых пространствах – беседки, террасы, лоджии.',
            slug: 'model-ute',
            parentId: lastId
        }
    });

    lastCategory = await prisma.category.create({
        data: {
            name: 'Модель FARGO',
            description: 'Модель FARGO это мебель из металла и  массива сосны  (клееный брус)  для использования в закрытых пространствах – беседки, террасы, лоджии.',
            slug: 'model-fargo',
            parentId: lastId
        }
    });

    lastCategory = await prisma.category.create({
        data: {
            name: 'Модель KOMFYR',
            description: 'Модель KOMFYR это мебель из массива сосны  (мебельный щит толщиной от 60 мм.)  для использования в закрытых пространствах – беседки, террасы.',
            slug: 'model-komfyr',
            parentId: lastId
        }
    });

    lastCategory = await prisma.category.create({
        data: {
            name: 'МЕБЕЛЬ ДЛЯ ЗАГОРОДНОГО ДОМА МЕТАЛЛ-МАССИВ',
            fullName: 'МЕБЕЛЬ ДЛЯ ЗАГОРОДНОГО ДОМА  МЕТАЛЛ-МАССИВ В РУСТИКАЛЬНОМ СТИЛЕ (ДЕРЕВЕНСКИЙ ШИК)',
            slug: 'mebel-dlya-zagorodnogo-doma-metall-massiv-v-rustikalnom-stile-derevenskiy-shik'
        }
    });

    lastId = lastCategory.id;

    lastCategory = await prisma.category.create({
        data: {
            name: 'Модель BARER',
            description: 'Модель BARER  это мебель из металла и  массива сосны  для использования в закрытых пространствах – дома, беседки, террасы, лоджии.',
            slug: 'model-barer',
            parentId: lastId
        }
    });

    lastCategory = await prisma.category.create({
        data: {
            name: 'САДОВАЯ МЕБЕЛЬ ИЗ МЕТАЛЛА И МАССИВА ДЕРЕВА',
            fullName: 'САДОВАЯ МЕБЕЛЬ ИЗ МЕТАЛЛА И МАССИВА ДЕРЕВА ДЛЯ ИСПОЛЬЗОВАНИЯ НА ОТКРЫТОМ ПРОСТРАНСТВЕ В Т.Ч. САДОВО ПАРКОВАЯ АРХИТЕКТУРА',
            slug: 'sadovaya-mebel-iz-metalla-i-massiva-dereva-dlya-ispolzovaniya-na-otkrytom-prostranstve-v-t-ch-sadovo-parkovaya-arkhitektura'
        }
    });

    lastId = lastCategory.id;

    lastCategory = await prisma.category.create({
        data: {
            name: 'Модель BENK',
            description: 'Модель BENK  это мебель из металла и массива сосны  для использования под открытым небом в общественных пространствах.',
            slug: 'model-benk',
            parentId: lastId
        }
    });

    lastCategory = await prisma.category.create({
        data: {
            name: 'МЕБЕЛЬ ДЛЯ БАРОВ РЕСТОРАНОВ МЕТАЛЛ-МАССИВ',
            slug: 'mebel-dlya-barov-restoranov-metall-massiv'
        }
    });

    lastId = lastCategory.id;

    lastCategory = await prisma.category.create({
        data: {
            name: 'Модель TABELL',
            description: 'Модель TABELL  это мебель из металла и массива сосны  для использования в условиях активной эксплуатации в общественных местах.',
            slug: 'model-tabel',
            parentId: lastId
        }
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
