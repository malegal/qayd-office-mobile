# إصلاح مصادقة أعضاء المكتب وانهيار التبويبات — خطة التنفيذ

> **For agentic workers:** نفّذ الخطوات بالتتابع مع اختبار كل مرحلة قبل الانتقال إلى التالية.

**Goal:** إكمال دعوة العضو تلقائيًا بعد تأكيد البريد ومنع عرض التبويبات أو تشغيل المزامنة قبل جاهزية الجلسة والعضوية وقاعدة البيانات.

**Architecture:** تخزين نية الانضمام أو تأسيس المكتب في AsyncStorage، ثم استهلاكها مرة واحدة عند أول جلسة مصادقة. حماية تخطيط التبويبات بحالات المصادقة والعضوية، وتشغيل SyncBootstrap في مكوّن فرعي لا يُركّب إلا بعد توفر office_id.

**Tech Stack:** Expo Router، React Native، Supabase Auth، AsyncStorage، SecureStore، SQLite/offline store، TypeScript، Vitest.

**Spec:** `/home/ubuntu/upload/pasted_content.txt`

## Global Constraints

- لا تطلب من المستخدم الضغط على قبول الدعوة مرتين.
- لا تستدعِ `useOfflineSync` قبل توفر `officeId`.
- لا تعرض التبويبات قبل التحقق من العضوية.
- لا تستخدم AsyncStorage لتخزين الجلسات السرية؛ الجلسة تبقى في SecureStore.
- لا تضف مكتبات جديدة.
- حافظ على RTL ورسائل الخطأ العربية.
- لا تعدّل مخطط قاعدة البيانات دون migration صريح.

---

### Task 1: حماية تخطيط التبويبات

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `hooks/use-offline-sync.ts` عند الحاجة فقط
- Test: فحص TypeScript واختبار التصدير

**Steps:**
- [ ] اجعل حالة العضوية `OfficeMembership | null | undefined`، بحيث تعني `undefined` التحميل.
- [ ] استخدم `useSupabaseAuth` داخل تخطيط التبويبات.
- [ ] أعد مؤقت تحميل أثناء `authLoading` أو `membership === undefined`.
- [ ] أعد `Redirect href="/"` عند غياب الجلسة.
- [ ] أعد `Redirect href="/onboarding"` عند وجود جلسة بلا عضوية.
- [ ] لا تركّب `SyncBootstrap` إلا بعد توفر العضوية.
- [ ] افصل `SyncRunner` إلى مكوّن فرعي يستدعي `useOfflineSync(membership.office_id)`، لأن استدعاء الخطاف مشروط داخل نفس المكوّن غير مسموح به.
- [ ] غيّر أيقونة الملفات إلى `folder.fill` والإشعارات إلى `bell.fill`.
- [ ] شغّل `pnpm check`.

### Task 2: تخزين النوايا المعلقة

**Files:**
- Create: `lib/pending-intent.ts`
- Modify: `app/index.tsx`
- Modify: `hooks/use-supabase-auth.ts`
- Modify: `lib/office-onboarding.ts`

**Interfaces:**
- `setPendingInvite(code: string, displayName: string): Promise<void>`
- `getPendingInvite(): Promise<{ code: string; displayName: string } | null>`
- `setPendingOffice(name: string, email: string): Promise<void>`
- `getPendingOffice(): Promise<{ name: string; email: string } | null>`
- `clearPendingIntent(): Promise<void>`

**Steps:**
- [ ] استخدم AsyncStorage بمفتاحين منفصلين للعضو والمكتب.
- [ ] احفظ نية الدعوة قبل `signInWithPassword` أو `signUp`.
- [ ] عند إنشاء حساب بلا جلسة، اعرض رسالة تفيد بأن الانضمام سيكتمل تلقائيًا بعد تأكيد البريد، ثم أوقف التنفيذ.
- [ ] عند وجود جلسة، نفّذ `acceptInvite` مرة واحدة ثم امسح النية.
- [ ] أضف معالجة النية في `useSupabaseAuth` عند `INITIAL_SESSION` و`SIGNED_IN`، مع منع التكرار أثناء المعالجة.
- [ ] احفظ نية `createOffice` عند إنشاء مالك يحتاج تأكيد البريد، ثم نفّذ إنشاء المكتب تلقائيًا بعد أول جلسة.
- [ ] وسّع ترجمة أخطاء Auth: rate limit، password length، invalid phone، network.
- [ ] أضف تحقق كود الدعوة وكلمة المرور قبل الطلب.
- [ ] أضف اختبارات وحدات لدوال التخزين إن أمكن دون تغيير إعدادات المشروع.

### Task 3: التحقق والبناء

**Steps:**
- [ ] شغّل `pnpm check`.
- [ ] شغّل اختبارات Vitest مع `EXPO_PUBLIC_SUPABASE_URL` و`EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] شغّل `git diff --check` وابحث عن conflict markers.
- [ ] راجع أن التغييرات مقتصرة على تطبيق الهاتف وخطة الإصلاح.
- [ ] أنشئ commit وصِف التغيير بوضوح.
- [ ] ادفع إلى GitHub وأنشئ/حدّث Pull Request.
- [ ] بعد الدمج، ابنِ APK عبر `eas build --platform android --profile preview --non-interactive`.

## سيناريوهات القبول

- [ ] العضو يضغط قبول مرة واحدة، وبعد تأكيد البريد يكمل تلقائيًا دون ضغط ثانٍ.
- [ ] عضو بلا عضوية لا يرى التبويبات ويُوجّه إلى onboarding.
- [ ] الضغط على أي تبويب بعد دخول العضو لا يسبب crash.
- [ ] الملفات والإشعارات تستخدمان الأيقونات الصحيحة.
- [ ] TypeScript والاختبارات تنجح.

## مراجعة ذاتية

- تغطي الخطة تخطيط التبويبات، pending intents، رسائل الأخطاء، الاختبارات والبناء.
- لا تتطلب أي تغيير قاعدة بيانات أو مكتبات جديدة.
- لا تعتمد على `useOfflineSync` قبل توفر office_id.
- يجب مراجعة نوع RPC الحالي `accept_office_invite` وعدم اختراع اسم جديد.

## Handoff

التنفيذ سيكون inline في الفرع الرئيسي المحلي بعد إنشاء فرع إصلاح مستقل، مع commitات منفصلة لكل مرحلة منطقية.
