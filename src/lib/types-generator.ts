import ts from 'typescript';
import { getFilesFromDirectory, writeFiles } from '../utils/file-utils';
import type { Logger } from '../types/logger';

export async function generateFileNamesUnionType(
  typename: string,
  outputPath: string,
  logger: Logger,
) {
  logger.info(`Stage 4/4: Generating TypeScript union type "${typename}"...`);

  const file = ts.createSourceFile('icons.ts', '', ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const files = await getFilesFromDirectory(outputPath);

  logger.info(`Found ${files.length} files for type generation`);

  const filenames = files.map(item => item.fileName.replace('.svg', ''));

  const stringLiterals = filenames.map(item => ts.factory.createStringLiteral(`${item}`));

  const literalTypeNodes = stringLiterals.map(item => ts.factory.createLiteralTypeNode(item));

  const typeReference = ts.factory.createUnionTypeNode(literalTypeNodes);

  const exportModifier = ts.factory.createModifier(ts.SyntaxKind.ExportKeyword);

  const typeDeclaration = ts.factory.createTypeAliasDeclaration(
    [exportModifier],
    ts.factory.createIdentifier(typename),
    undefined,
    typeReference,
  );

  const result = printer.printNode(ts.EmitHint.Unspecified, typeDeclaration, file);

  await writeFiles([{ content: result, fileName: 'types.ts', filePath: `${outputPath}/types.ts` }]);

  logger.info(`Stage 4/4 complete — types.ts written to ${outputPath}`);
}
