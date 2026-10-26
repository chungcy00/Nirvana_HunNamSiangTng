import { prepareUploadPreviews } from './imagePreviews';
import { OfferAttributes } from './OfferAttributes';
import { draftKey, readDraft, writeDraft } from './draftStorage';
import { InclusionEditor } from './InclusionEditor';
import { ServiceVenueField } from './ServiceVenueField';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { useAuth } from './auth';
import { useAdmin } from './context';
import { Check, Field, Modal, Photo, Preview, ImageUpload } from './components';
import { ReferenceDialog } from './references';
import { changesFor, priceLines, reclassify, uuid, validate, updateCommonAttribute } from './model';
import { readProduct, rpc, errorText, supabase, removeUnreferenced } from './client';
import {
  type Row,
  type Bundle,
  type DictionaryKind,
  sections,
  categories,
  capacities,
  statuses,
  tableFor,
  money,
} from './types';

export default function Editor() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { member } = useAuth(),
    { refs, reload, notify } = useAdmin();
  const [bundle, setBundle] = useState<Bundle | null>(null),
    [original, setOriginal] = useState<Bundle | null>(null),
    [section, setSection] = useState(0),
    [errors, setErrors] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false),
    [guide, setGuide] = useState(false),
    [confirmPublish, setConfirmPublish] = useState(false),
    [related, setRelated] = useState<DictionaryKind | null>(null),
    [uploadBucket, setUploadBucket] = useState('catalog-media-private'),
    [uploadImageType, setUploadImageType] = useState('real'),
    [draftStatus, setDraftStatus] = useState(''),
    [actionBarHeight, setActionBarHeight] = useState(0);
  const actionBar = useRef<HTMLDivElement>(null);
  const staged = useRef<Row[]>([]),
    ignoreLeave = useRef(false);
  const editorReady = !!bundle;
  useEffect(() => {
    const bar = actionBar.current;
    if (!bar) return;
    const measure = () => setActionBarHeight(Math.ceil(bar.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [editorReady]);
  const localKey = member?.user_id && id ? draftKey(member.user_id, id) : '';
  const dirty = !!bundle && !!original && JSON.stringify(bundle) !== JSON.stringify(original);
  const blocker = useBlocker(dirty && !ignoreLeave.current);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('产品还有未保存到后台的修改。本机暂存不能代替保存草稿，是否仍要离开？')) {
        blocker.proceed();
      } else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!bundle || !original || !localKey || bundle.product.id !== id) return;
    try {
      if (dirty) {
        const savedAt = writeDraft(window.localStorage, localKey, original, bundle, staged.current);
        setDraftStatus(
          `已自动暂存到本机 ${new Date(savedAt).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Kuching' })}，尚未保存到后台。`,
        );
      } else {
        window.localStorage.removeItem(localKey);
        setDraftStatus('当前资料已与后台一致。');
      }
    } catch {
      setDraftStatus(
        '本机自动暂存失败，请立即使用下方保存按钮或导出修改备份，离开页面可能丢失输入。',
      );
    }
  }, [bundle, original, localKey, dirty, id]);
  async function load(restoreLocal = true) {
    try {
      const data = await readProduct(id!);
      if (!data) throw new Error('产品不存在或无法读取。');
      let cached = null;
      if (restoreLocal && localKey) {
        try {
          cached = readDraft(window.localStorage, localKey);
        } catch {
          notify('本机暂存无法读取，已显示后台资料。请勿清除浏览器数据，并联系管理员。');
        }
      }
      if (cached && cached.bundle.product.id === data.product.id) {
        // Retain the original server version so RPC conflict checks protect newer remote edits.
        setOriginal(cached.original);
        setBundle(cached.bundle);
        staged.current = cached.staged;
        setErrors(
          cached.original.product.updated_at !== data.product.updated_at
            ? [
                '已恢复本机输入，但后台资料已有其他更新。请先导出当前修改备份，再重新载入最新资料核对。',
              ]
            : [],
        );
        notify('已恢复本机暂存的未发布修改，请核对后保存到后台。');
      } else {
        setOriginal(data);
        setBundle(structuredClone(data));
        setErrors([]);
      }
    } catch (e) {
      setErrors([errorText(e)]);
    }
  }
  useEffect(() => {
    staged.current = [];
    ignoreLeave.current = false;
    setBundle(null);
    setOriginal(null);
    void load();
  }, [id]);
  if (!bundle || !original)
    return (
      <section>
        <h1>产品编辑</h1>
        {errors.length ? (
          <p className="error" role="alert">
            {errors.join(' ')} <button onClick={() => void load()}>重试</button>
          </p>
        ) : (
          <p role="status">正在读取产品资料…</p>
        )}
      </section>
    );
  const p = bundle.product,
    editable = member?.role === 'admin' || p.publication_status === 'draft';
  const setProduct = (k: string, v: any) =>
    setBundle((b) => ({ ...b!, product: { ...b!.product, [k]: v } }));
  const setRows = (table: string, rows: Row[]) => setBundle((b) => ({ ...b!, [table]: rows }));
  const update = (table: string, key: string, k: string, v: any) =>
    setBundle((b) => ({
      ...b!,
      [table]: b![table].map((r: Row) => ((r.id || r.product_id) === key ? { ...r, [k]: v } : r)),
    }));
  const remove = (table: string, key: string) =>
    setRows(
      table,
      bundle[table].filter((r: Row) => (r.id || r.product_id) !== key),
    );
  const relationOptions: [string, string][] = [
    ['', '共通'],
    ...bundle.product_religions.map(
      (r: Row) =>
        [
          String(r.religion_id),
          refs.religions.find((x) => x.id === r.religion_id)?.name || '未命名宗教',
        ] as [string, string],
    ),
  ];
  const field = (
    label: string,
    k: string,
    type = 'text',
    hint?: string,
    options?: [string, string][],
    wide = false,
  ) => (
    <Field
      key={k}
      label={label}
      value={p[k]}
      onChange={(v) => setProduct(k, options && v === '' ? null : v)}
      type={type}
      hint={hint}
      options={options}
      wide={wide}
    />
  );
  const childField = (
    table: string,
    row: Row,
    label: string,
    k: string,
    type = 'text',
    options?: [string, string][],
    wide = false,
  ) => (
    <Field
      key={k}
      label={label}
      value={row[k]}
      onChange={(v) =>
        update(
          table,
          row.id || row.product_id,
          k,
          options ? (v === '' ? null : ['religion_id'].includes(k) ? Number(v) : v) : v,
        )
      }
      type={type}
      options={options}
      wide={wide}
    />
  );
  const attrs = bundle[tableFor(p.category_id)]?.[0] || { product_id: p.id };
  const attr = (label: string, k: string, type = 'text', options?: [string, string][]) => (
    <Field
      key={k}
      label={label}
      value={attrs[k]}
      type={type}
      options={options}
      onChange={(v) =>
        setBundle((current) => updateCommonAttribute(current!, k, options && v === '' ? null : v))
      }
    />
  );
  function move(table: string, from: number, to: number) {
    if (to < 0 || to >= bundle![table].length) return;
    const rows = [...bundle![table]];
    rows.splice(to, 0, rows.splice(from, 1)[0]);
    setRows(
      table,
      rows.map((r, i) => ({ ...r, sort_order: i })),
    );
  }
  async function save(status: string) {
    if (busy) return;
    const checks = validate(bundle!, status === 'published');
    if (checks.length) {
      setErrors(checks);
      setConfirmPublish(false);
      return;
    }
    setBusy(true);
    setErrors([]);
    setConfirmPublish(false);
    try {
      const previous = original!,
        stagedBefore = [...staged.current];
      await rpc('save_product', changesFor(previous, bundle!, status));
      const data = await readProduct(p.id);
      setOriginal(data);
      setBundle(structuredClone(data));
      staged.current = [];
      notify(status === 'published' ? '产品已保存并发布。' : '产品已保存。');
      const removed = [...previous.product_images, ...stagedBefore].filter(
        (r: Row) =>
          !data.product_images.some(
            (x: Row) => x.storage_path === r.storage_path && x.storage_bucket === r.storage_bucket,
          ),
      );
      if (removed.length)
        try {
          await removeUnreferenced(removed);
        } catch {
          notify('资料已保存；旧文件清理未完成，可在图片区重试。');
          staged.current = removed;
        }
    } catch (e) {
      setErrors([errorText(e)]);
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null, replace?: string) {
    if (!files?.length || busy) return;
    setBusy(true);
    setErrors([]);
    try {
      for (const file of Array.from(files)) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10485760)
          throw new Error('仅支持 JPEG、PNG、WebP，单张不超过 10 MB。');
        const bitmap = await createImageBitmap(file);
        bitmap.close();
        const ext =
            file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png',
          path = `${p.id}/${uuid()}.${ext}`;
        const bucket = replace
          ? bundle!.product_images.find((x: Row) => x.id === replace)?.storage_bucket ||
            uploadBucket
          : uploadBucket;
        const result = await supabase!.storage
          .from(bucket)
          .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '0' });
        if (result.error) throw result.error;
        const previous = replace ? bundle!.product_images.find((x: Row) => x.id === replace) : null;
        const row = {
          id: uuid(),
          product_id: p.id,
          storage_bucket: bucket,
          storage_path: path,
          alt_text: previous?.alt_text || file.name,
          religion_id: previous?.religion_id || null,
          design_name: previous?.design_name || null,
          image_type: previous?.image_type || uploadImageType,
          sort_order: previous?.sort_order || bundle!.product_images.length,
          is_primary: previous?.is_primary || false,
          is_published: false,
        };
        staged.current.push(row);
        try { await prepareUploadPreviews(file,bucket,path); }
        catch { notify('照片已上传，预览图暂未准备完成；原图仍可使用。'); }
        setBundle((b) => ({
          ...b!,
          product_images: [...b!.product_images.filter((x: Row) => x.id !== replace), row],
        }));
      }
    } catch (e) {
      setErrors([errorText(e)]);
    } finally {
      setBusy(false);
    }
  }
  const addOffer = () =>
    setRows('product_offers', [
      ...bundle.product_offers,
      {
        id: uuid(),
        product_id: p.id,
        offer_code: `offer-${uuid()}`,
        name: '',
        is_active: true,
        religion_id: null,
        position_type: null,
        facing_override: null,
        area_sqft_override: null,
        sort_order: bundle.product_offers.length,
      },
    ]);
  const priceInput = (offer: Row, type: string) => {
    const row = bundle.offer_prices.find(
      (r: Row) => r.offer_id === offer.id && r.price_type === type,
    );
    return (
      <div key={type} className="entry">
        <Field
          label={
            type === 'pre_need'
              ? '预购价格（RM）'
              : type === 'at_need'
                ? '即用价格（RM）'
                : p.category_id === 3
                  ? '最低价格（RM）'
                  : '实际售价（RM）'
          }
          value={row?.price_amount}
          type="number"
          onChange={(v) => {
            const other = bundle.offer_prices.filter((r: Row) => r.id !== row?.id);
            setRows(
              'offer_prices',
              v === null
                ? other
                : [
                    ...other,
                    {
                      ...(row || {
                        id: uuid(),
                        offer_id: offer.id,
                        price_type: type,
                        currency: 'MYR',
                        is_published: false,
                      }),
                      price_amount: v,
                    },
                  ],
            );
          }}
        />
        {row && (
          <>
            <Check
              label="批准公开此价格"
              value={row.is_published}
              onChange={(v) => update('offer_prices', row.id, 'is_published', v)}
            />
            {childField(
              'offer_prices',
              row,
              type === 'pre_need'
                ? '预购价格备注'
                : type === 'at_need'
                  ? '即用价格备注'
                  : '方案专属价格备注',
              'price_note',
              'textarea',
            )}
          </>
        )}
      </div>
    );
  };
  return (
    <div className="product-editor-page" style={{ paddingBottom: actionBarHeight + 16, '--editor-action-height': `${actionBarHeight}px` } as CSSProperties}>
      <div className="pagehead row between">
        <div>
          <h1>{p.name || '未命名草稿'}</h1>
          <p>
            {categories[p.category_id]} ·{' '}
            <span className={`badge ${p.publication_status}`}>
              {statuses[p.publication_status]}
            </span>
            {dirty && <span className="badge">有未保存修改</span>}
          </p>
        </div>
        <div className="row">
          <button onClick={() => navigate('/products')}>返回列表</button>
          <button
            onClick={() => {
              if (
                !dirty ||
                window.confirm('重新载入将清除本机暂存并放弃当前未保存修改，是否继续？')
              )
                void load(false);
            }}
          >
            重新载入
          </button>
          <button onClick={() => setGuide(true)}>添加与修改指引</button>
          <button onClick={() => setPreview(true)}>预览</button>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="error" role="alert">
          <strong>未完成保存</strong>
          <ul>
            {errors.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          {p.category_id !== 4 && errors.some((message) => /图片|主图|设计名称/.test(message)) && (
            <button onClick={() => setSection(5)}>前往图片管理</button>
          )}
          <button
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
              );
              const a = document.createElement('a');
              a.href = url;
              a.download = '未保存产品修改.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            导出当前修改备份
          </button>
        </div>
      )}
      {editable && (
        <p className="help" role="status">
          {draftStatus} 本机暂存仅在当前浏览器恢复；跨设备使用请保存草稿。
          {draftStatus.includes('失败') && (
            <button
              onClick={() => setErrors(['本机自动暂存失败，请导出当前修改备份或保存到后台。'])}
            >
              导出备份入口
            </button>
          )}
        </p>
      )}
      {!editable && <p className="permission">当前为只读预览。编辑员仅能修改从未发布的草稿。</p>}
      <div className="editor">
        <nav className="sections" aria-label="编辑分区">
          {sections.map((s, i) =>
            p.category_id === 4 && i === 5 ? null : (
              <button
                key={s}
                aria-current={section === i ? 'step' : undefined}
                className={section === i ? 'active' : ''}
                onClick={() => setSection(i)}
              >
                {s}
              </button>
            ),
          )}
        </nav>
        <div>
          <fieldset disabled={!editable || busy}>
            {section === 0 && (
              <section className="panel">
                <h2>基本资料</h2>
                <div className="fields">
                  {field('产品名称', 'name')}
                  <Field
                    label="产品类别"
                    value={p.category_id}
                    onChange={(v) => {
                      if (Number(v) === 4 && bundle.product_images.length) {
                        setErrors(['殡仪服务不使用照片，请先移除当前产品图片再切换类别。']);
                        return;
                      }
                      if (window.confirm('切换类别将清除不适用的属性及价格，是否继续？'))
                        setBundle(reclassify(bundle, Number(v)));
                    }}
                    options={categories.slice(1).map((n, i) => [String(i + 1), n])}
                  />
                  <div className="field">
                    <label htmlFor="series">园区／产品系列</label>
                    <div className="inline-related">
                      <select
                        id="series"
                        value={p.series_id || ''}
                        onChange={(e) => setProduct('series_id', e.target.value || null)}
                      >
                        <option value="">暂不指定</option>
                        {refs.series
                          .filter((s) => s.is_active || s.id === p.series_id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {!s.is_active ? '（已停用，保留原关联）' : ''}
                            </option>
                          ))}
                      </select>
                      {member?.role === 'admin' && (
                        <button onClick={() => setRelated('series')}>＋ 新增</button>
                      )}
                    </div>
                  </div>
                  {field('内部产品代码', 'product_code', 'text', '仅后台可见，填写时必须唯一。')}
                  {p.category_id <= 2 &&
                    field('产品类型', 'product_form', 'text', undefined, [
                      ['', '暂不选择'],
                      ['lot', '地段'],
                      ['package', '配套'],
                      ['other', '其他'],
                    ])}
                  {p.category_id <= 3 && (
                    <>
                      <Field
                        label="使用人数"
                        value={p.capacity_group}
                        onChange={(v) => {
                          setProduct('capacity_group', v || null);
                          setProduct(
                            'capacity_count',
                            ({ single: 1, double: 2, triple: 3 } as any)[v] || null,
                          );
                        }}
                        options={[
                          ['', '暂不选择'],
                          ...(p.category_id === 3
                            ? ['single', 'double', 'triple', 'four_plus']
                            : ['single', 'double', 'family']
                          ).map((k) => [k, capacities[k]] as [string, string]),
                        ]}
                      />
                      {['family', 'four_plus'].includes(p.capacity_group || '') &&
                        field(
                          '实际人数',
                          'capacity_count',
                          'number',
                          '仅家庭或四人及以上规格需要补充；单人、双人、三人由系统确定。',
                        )}
                    </>
                  )}
                  {field('产品副标题', 'subtitle')}
                  {field('产品简介', 'description', 'textarea', undefined, undefined, true)}
                  {field('内部备注', 'internal_notes', 'textarea', '仅后台可见。', undefined, true)}
                </div>
                <p className="help">
                  最后修改：
                  {new Date(p.updated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Kuching' })} ·
                  操作人：{p.updated_by || '系统维护'}
                  <br />
                  产品网址由系统自动生成，修改名称不会改变已有链接。
                  <br />
                  新产品和重分类产品自动排到类别末尾；展示顺序在产品列表独立调整。
                </p>
              </section>
            )}
            {section === 1 && (
              <section className="panel">
                <h2>类别专属属性</h2>
                {p.category_id <= 2 && (
                  <p className="help">
                    在这里填写所有价格方案共用的规格。价格页默认沿用；只有某方案不同时才补充差异。
                  </p>
                )}
                <div className="fields">
                  {p.category_id <= 2 ? (
                    <>
                      {attr('共通朝向', 'facing')}
                      {attr('共通面积（sqft）', 'area_sqft', 'number')}
                      {attr('安葬说明', 'burial_notes', 'textarea')}
                    </>
                  ) : p.category_id === 3 ? (
                    <>
                      {attr('产品主题', 'theme_name')}
                      {attr('设计款式说明', 'niche_style', 'textarea')}
                      {attr('补充说明', 'niche_notes', 'textarea')}
                      {attr('安放环境（发布必选）', 'placement_type', 'text', [
                        ['', '暂不选择（草稿）'],
                        ['indoor', '室内'],
                        ['outdoor', '室外'],
                      ])}
                    </>
                  ) : p.category_id === 4 ? (
                    <>
                      {attr('服务天数', 'duration_days', 'number')}
                      {attr('服务夜数', 'duration_nights', 'number')}
                      {attr('适用安葬方式（前台标签）', 'funeral_method', 'text', [
                        ['', '暂不选择'],
                        ['cremation', '火化'],
                        ['burial', '土葬'],
                        ['both', '火化／土葬皆适用'],
                      ])}
                      <ServiceVenueField
                        value={attrs.service_venue}
                        onChange={(value) =>
                          setRows('funeral_details', [{ ...attrs, service_venue: value }])
                        }
                      />
                    </>
                  ) : p.category_id === 5 ? (
                    <>
                      {attr('牌位类型', 'tablet_type')}
                      {attr('牌位容量', 'tablet_capacity', 'number')}
                      {attr('朝向', 'facing')}
                      {attr('补充说明', 'tablet_notes', 'textarea')}
                    </>
                  ) : p.category_id === 6 ? (
                    <>
                      {attr('生基类型', 'fengshui_type')}
                      {attr('朝向', 'facing')}
                      {attr('面积（sqft）', 'area_sqft', 'number')}
                      {attr('配置说明', 'configuration_notes', 'textarea')}
                    </>
                  ) : (
                    <>
                      {attr('安葬类型', 'pet_burial_method', 'text', [
                        ['', '暂不选择'],
                        ['body_burial', '遗体土葬'],
                        ['ash_burial', '骨灰安葬'],
                      ])}
                      {attr('宠物规格', 'pet_size_class')}
                      {attr('面积（sqft）', 'area_sqft', 'number')}
                      {attr('朝向', 'facing')}
                      {attr('补充说明', 'pet_notes', 'textarea')}
                    </>
                  )}
                </div>
              </section>
            )}
            {section === 2 && (
              <section className="panel">
                <h2>宗教与设计</h2>
                {p.category_id > 4 ? (
                  <p>此类别不要求宗教配置，前台不提供宗教筛选。</p>
                ) : (
                  <>
                    <p className="help">新增宗教仅加入字典；关联和公开需要分别设置。</p>
                    <div className="row">
                      {refs.religions
                        .filter(
                          (r) =>
                            r.is_active &&
                            !bundle.product_religions.some((x: Row) => x.religion_id === r.id),
                        )
                        .map((r) => (
                          <button
                            key={r.id}
                            onClick={() =>
                              setRows('product_religions', [
                                ...bundle.product_religions,
                                {
                                  id: uuid(),
                                  product_id: p.id,
                                  religion_id: r.id,
                                  configuration_name: '',
                                  configuration_notes: '',
                                  is_published: false,
                                },
                              ])
                            }
                          >
                            添加{r.name}
                          </button>
                        ))}
                      {member?.role === 'admin' && (
                        <button onClick={() => setRelated('religions')}>＋ 新增宗教</button>
                      )}
                    </div>
                    {bundle.product_religions.map((r: Row) => (
                      <div className="entry" key={r.id}>
                        <div className="row between">
                          <h3>{refs.religions.find((x) => x.id === r.religion_id)?.name}</h3>
                          <button
                            onClick={() => {
                              if (
                                ['product_images', 'product_inclusions', 'product_offers'].some(
                                  (t) =>
                                    bundle[t].some((x: Row) => x.religion_id === r.religion_id),
                                )
                              ) {
                                setErrors([
                                  '此宗教仍有图片、包含项目或价格方案关联，请先调整关联。',
                                ]);
                                return;
                              }
                              remove('product_religions', r.id);
                            }}
                          >
                            移除关联
                          </button>
                        </div>
                        <div className="fields">
                          {p.category_id !== 4 && (
                            <>
                              {childField(
                                'product_religions',
                                r,
                                '宗教配置标题',
                                'configuration_name',
                              )}
                              {childField(
                                'product_religions',
                                r,
                                '宗教补充说明',
                                'configuration_notes',
                                'textarea',
                              )}
                            </>
                          )}
                          <Check
                            label="公开此宗教配置"
                            value={r.is_published}
                            onChange={(v) => update('product_religions', r.id, 'is_published', v)}
                          />
                        </div>
                        {p.category_id !== 4 && (
                          <button onClick={() => setSection(5)}>管理设计图片</button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </section>
            )}
            {section === 3 && (
              <InclusionEditor
                cremationBurial={p.category_id === 1}
                rows={bundle.product_inclusions}
                productId={p.id}
                onChange={(rows) => setRows('product_inclusions', rows)}
                religions={relationOptions}
                offers={[
                  ['', '产品共通'],
                  ...bundle.product_offers.map(
                    (o: Row) => [o.id, o.name || '默认方案'] as [string, string],
                  ),
                ]}
                religious={p.category_id <= 3}
                productScoped={p.category_id === 4}
              />
            )}
            {section === 4 && (
              <section className="panel">
                <div className="row between">
                  <h2>价格</h2>
                  {![3, 4].includes(p.category_id) && (
                    <button onClick={addOffer}>添加价格方案</button>
                  )}
                </div>
                <p className="help">
                  金额必须大于零。清空金额表示不保存该价格行；骨灰位仅有一条最低价，殡仪两种价格互不相加。
                </p>
                {p.category_id <= 2 && <p className="notice">每个「面积 × 地段类型」建立一个方案，例如：864 sqft 普通地段、864 sqft 角头地段、1,080 sqft 普通地段。方案名称填写地段类型，面积在「方案规格」填写，售价填写该方案金额；前台会按面积分组，不必把面积重复写进名称。</p>}
                {bundle.product_offers.map((o: Row, index: number) => (
                  <div className="offer-card" key={o.id} role="group" aria-label={`价格方案 ${index + 1}：${o.name || '未命名方案'}`}>
                    {![3, 4].includes(p.category_id) && (
                      <>
                        <div className="offer-heading row between">
                          <h3>{o.name || '未命名方案'}</h3>
                          <div className="row">
                            <Check
                              label="启用"
                              value={o.is_active}
                              onChange={(v) => update('product_offers', o.id, 'is_active', v)}
                            />
                            <button
                              onClick={() => {
                                if (
                                  bundle.product_inclusions.some((r: Row) => r.offer_id === o.id)
                                ) {
                                  setErrors(['此方案仍有关联包含项目，请先调整。']);
                                  return;
                                }
                                setRows(
                                  'product_offers',
                                  bundle.product_offers.filter((r: Row) => r.id !== o.id),
                                );
                                setRows(
                                  'offer_prices',
                                  bundle.offer_prices.filter((r: Row) => r.offer_id !== o.id),
                                );
                              }}
                            >
                              删除方案
                            </button>
                          </div>
                        </div>
                        <div className="fields">
                          {childField('product_offers', o, '方案名称', 'name')}
                          {p.category_id <= 4 &&
                            childField(
                              'product_offers',
                              o,
                              '适用宗教',
                              'religion_id',
                              'text',
                              relationOptions,
                            )}
                          {p.category_id <= 2 && <OfferAttributes offer={o} common={attrs} onChange={(key,value) => update('product_offers', o.id, key, value)} />}
                        </div>
                      </>
                    )}
                    {(p.category_id === 4 ? ['pre_need', 'at_need'] : ['standard']).map((t) =>
                      priceInput(o, t),
                    )}
                  </div>
                ))}
                {field(
                  '产品共通价格备注',
                  'price_note_override',
                  'textarea',
                  '适用于整个产品的说明只在此填一次；仅适用于某个价格的条件请填在该价格下。',
                )}
              </section>
            )}
            {section === 5 && p.category_id !== 4 && (
              <section className="panel">
                <h2>图片管理</h2>
                <p className="help">
                  支持 JPEG、PNG、WebP，单张不超过 10 MB。照片保留原色；上传或替换后，请保存产品。
                  实景图用于上方大图与缩略图；设计图仅用于下方设计参考，不进入实景相册。
                  设计名称选填，留空仍可保存和批准公开。
                </p>
                <div className="upload">
                  <Field
                    label="上传素材访问范围"
                    value={uploadBucket}
                    onChange={setUploadBucket}
                    options={[
                      ['catalog-media-private', '普通产品素材'],
                      ['catalog-media-restricted', '受限内部素材'],
                    ]}
                  />
                  <Field
                    label="上传图片用途"
                    value={uploadImageType}
                    onChange={setUploadImageType}
                    options={[["real", "实景相册"], ["design", "宗教与设计参考"]]}
                  />
                  <ImageUpload
                    label="上传单张或多张图片"
                    multiple
                    onSelect={(files) => void upload(files)}
                  />
                </div>
                {['real', 'design'].map((imageGroup) => <div key={imageGroup}>
                  <h3>{imageGroup === 'real' ? '实景相册' : '宗教与设计参考'}</h3>
                  <div className="imagegrid">
                  {bundle.product_images.map((r: Row, i: number) => ({r, i}))
                    .filter(({r}: {r: Row}) => (r.image_type === 'design') === (imageGroup === 'design'))
                    .map(({r, i}: {r: Row; i: number}) => (
                    <article
                      className="imageitem"
                      key={r.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = bundle.product_images.findIndex(
                          (x: Row) => x.id === e.dataTransfer.getData('text/plain'),
                        );
                        if (from >= 0) move('product_images', from, i);
                      }}
                    >
                      <Photo image={r} className="editor-photo" />
                      <div className="row between">
                        <span className="badge">
                          {r.is_primary
                            ? '主图'
                            : r.storage_bucket === 'catalog-media-restricted'
                              ? '受限素材'
                              : `图片 ${i + 1}`}
                        </span>
                        <button
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                          aria-label={`拖动图片${i + 1}`}
                        >
                          <GripVertical size={16} />
                        </button>
                      </div>
                      {childField('product_images', r, '图片说明', 'alt_text')}
                      <Field label="图片用途" value={r.image_type === 'design' ? 'design' : 'real'}
                        options={[["real", "实景相册"], ["design", "宗教与设计参考"]]}
                        onChange={(v) => setRows('product_images', bundle.product_images.map((x: Row) => x.id === r.id
                          ? {...x, image_type: v, is_primary: v === 'design' ? false : x.is_primary} : x))}/>

                      {p.category_id <= 4 &&
                        childField(
                          'product_images',
                          r,
                          '适用宗教',
                          'religion_id',
                          'text',
                          relationOptions,
                        )}
                      <Field
                        label="设计名称（选填）"
                        value={r.design_name}
                        onChange={(v) =>
                          setRows(
                            'product_images',
                            bundle.product_images.map((x: Row) =>
                              x.id === r.id ||
                              (r.design_name &&
                                x.design_name === r.design_name &&
                                x.religion_id === r.religion_id)
                                ? { ...x, design_name: v }
                                : x,
                            ),
                          )
                        }
                      />
                      {r.image_type === 'design' && r.religion_id && (
                        <p className="help">设计名称可留空；填写后会显示在前台设计图下方。</p>
                      )}
                      <Check
                        label="设为共通主图"
                        disabled={
                          r.image_type === 'design' || !!r.religion_id || r.storage_bucket === 'catalog-media-restricted'
                        }
                        value={r.is_primary}
                        onChange={(v) =>
                          setRows(
                            'product_images',
                            bundle.product_images.map((x: Row) => ({
                              ...x,
                              is_primary: x.id === r.id ? v : false,
                            })),
                          )
                        }
                      />
                      <Check
                        label="批准公开图片"
                        disabled={r.storage_bucket === 'catalog-media-restricted'}
                        value={r.is_published}
                        onChange={(v) => update('product_images', r.id, 'is_published', v)}
                      />
                      <div className="row">
                        <button
                          aria-label={`图片${i + 1}上移`}
                          disabled={!i}
                          onClick={() => move('product_images', i, i - 1)}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          aria-label={`图片${i + 1}下移`}
                          disabled={i === bundle.product_images.length - 1}
                          onClick={() => move('product_images', i, i + 1)}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button onClick={() => remove('product_images', r.id)}>移除图片</button>
                      </div>
                      <ImageUpload
                        label="替换文件"
                        onSelect={(files) => void upload(files, r.id)}
                      />
                    </article>
                  ))}
                  </div>
                </div>)}
                <button
                  onClick={async () => {
                    try {
                      const unreferenced = staged.current.filter(
                        (r) =>
                          !bundle.product_images.some(
                            (x: Row) =>
                              x.storage_bucket === r.storage_bucket &&
                              x.storage_path === r.storage_path,
                          ),
                      );
                      await removeUnreferenced(unreferenced);
                      staged.current = staged.current.filter((r) => !unreferenced.includes(r));
                      notify('无引用文件清理完成。');
                    } catch (e) {
                      setErrors([errorText(e)]);
                    }
                  }}
                  disabled={
                    !staged.current.some(
                      (r) =>
                        !bundle.product_images.some(
                          (x: Row) =>
                            x.storage_bucket === r.storage_bucket &&
                            x.storage_path === r.storage_path,
                        ),
                    )
                  }
                >
                  重试无引用文件清理
                </button>
              </section>
            )}
            {section === 6 && (
              <section className="panel">
                <h2>发布管理</h2>
                <p>当前状态：{statuses[p.publication_status]}</p>
                <p className="notice">
                  预览不会发布。确认保存并发布后，产品、宗教、价格、图片引用、包含项目及审计在同一事务提交；任一步失败均保留原有效资料。
                </p>
                <ul>
                  {validate(bundle, true).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                {p.publication_status !== 'draft' && (
                  <p className="help">
                    正式产品不保存为草稿；修改只暂存在当前表单，确认后一次提交。
                  </p>
                )}
              </section>
            )}
          </fieldset>
        </div>
      </div>
      <div ref={actionBar} className="stickyactions row between" role="region" aria-label="产品保存操作">
        <span role="status">
          {busy ? '正在处理，请稍候…' : dirty ? '有未保存修改' : '已载入最新资料'}
        </span>
        <div className="row">
          <button onClick={() => setPreview(true)}>预览</button>
          {editable && (
            <>
              {p.publication_status === 'draft' && (
                <button disabled={busy} onClick={() => void save('draft')}>
                  保存草稿
                </button>
              )}
              {p.publication_status === 'hidden' && (
                <button disabled={busy} onClick={() => void save('hidden')}>
                  保存修改（保持隐藏）
                </button>
              )}
              {member?.role === 'admin' && (
                <>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => {
                      const checks = validate(bundle, true);
                      if (checks.length) {
                        setErrors(checks);
                        setSection(6);
                      } else setConfirmPublish(true);
                    }}
                  >
                    保存并发布
                  </button>
                  {p.publication_status === 'published' && (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm('隐藏后网站无法读取此产品，确认保存当前修改并隐藏？'))
                          void save('hidden');
                      }}
                    >
                      隐藏产品
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      {guide && (
        <Modal title="添加与修改指引" onClose={() => setGuide(false)}>
          <ol>
            <li>填写「基本资料」与「类别专属属性」，再到「宗教与设计」添加适用宗教。</li>
            <li>在「包含项目」添加服务内容，在「价格」添加或修改方案售价。</li>
            {p.category_id !== 4 && (
              <li>
                在「图片管理」上传原色照片，可修改说明、替换文件、排序并设置一张共通主图。设计名称选填。
              </li>
            )}
            <li>
              点击「预览」核对当前内容，再使用页面底部的保存按钮。草稿可先保存，补齐资料后由管理员保存并发布。
            </li>
          </ol>
          <p className="help">
            输入会自动暂存到当前浏览器，刷新后可恢复。请使用保存按钮写入后台；预览和上传不会自动发布。
          </p>
          <div className="row">
            <button
              onClick={() => {
                setSection(0);
                setGuide(false);
              }}
            >
              编辑基本资料
            </button>
            <button
              onClick={() => {
                setSection(4);
                setGuide(false);
              }}
            >
              添加或修改价格
            </button>
            {p.category_id !== 4 && (
              <button
                onClick={() => {
                  setSection(5);
                  setGuide(false);
                }}
              >
                添加或替换图片
              </button>
            )}
          </div>
        </Modal>
      )}
      {preview && <Preview bundle={bundle} refs={refs} onClose={() => setPreview(false)} />}
      {related && (
        <ReferenceDialog
          kind={related}
          onClose={() => setRelated(null)}
          onSaved={(r) => {
            const kind = related;
            void reload();
            setRelated(null);
            if (kind === 'series') setProduct('series_id', r.id);
            notify(
              kind === 'religions'
                ? '宗教已新增，请单独添加关联并设置公开状态。'
                : '系列已保存并选入当前产品。',
            );
          }}
        />
      )}
      {confirmPublish && (
        <Modal title="确认保存并发布" onClose={() => setConfirmPublish(false)}>
          <p>请核对价格修改。确认后当前表单内容将一次发布，网站可读取更新。</p>
          <table className="confirmation">
            <thead>
              <tr>
                <th>价格项目</th>
                <th>当前数据库</th>
                <th>本次提交</th>
              </tr>
            </thead>
            <tbody>
              {priceLines(bundle).map((r: Row) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td>
                    {money(original.offer_prices.find((x: Row) => x.id === r.id)?.price_amount)}
                  </td>
                  <td>{money(r.price_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button onClick={() => setConfirmPublish(false)}>返回核对</button>
            <button className="primary" onClick={() => void save('published')}>
              确认保存并发布
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
