import Foundation
import Shared

@MainActor
final class LastSongStore {
    private let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("SingBridge", isDirectory: true)
    private var activeFile: String?
    private var manifest: URL { directory.appendingPathComponent("current.json") }

    struct SavedSong: Codable {
        let version: Int
        let fileName: String
        let title: String
        let lyrics: String
    }

    func destination(for source: URL) throws -> URL {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var folder = directory
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try folder.setResourceValues(values)
        let suffix = String(source.pathExtension.filter { $0.isASCII && $0.isLetter || $0.isNumber }.prefix(10))
        return directory.appendingPathComponent("song-\(UUID().uuidString).\(suffix.isEmpty ? "audio" : suffix)")
    }

    nonisolated static func copyAudio(from source: URL, to destination: URL) throws {
        let input = try FileHandle(forReadingFrom: source)
        defer { try? input.close() }
        guard FileManager.default.createFile(atPath: destination.path, contents: nil) else {
            throw CocoaError(.fileWriteUnknown)
        }
        let output = try FileHandle(forWritingTo: destination)
        defer { try? output.close() }
        var total = 0
        while let chunk = try input.read(upToCount: 65_536), !chunk.isEmpty {
            total += chunk.count
            guard total <= 256 * 1_024 * 1_024 else { throw CocoaError(.fileReadTooLarge) }
            try output.write(contentsOf: chunk)
        }
        try output.synchronize()
    }

    func save(audio: ImportedAudio, lyrics: String) -> String? {
        do {
            guard let url = URL(string: audio.uri) else { throw CocoaError(.fileWriteInvalidFileName) }
            let saved = SavedSong(version: 1, fileName: url.lastPathComponent, title: audio.name, lyrics: lyrics)
            try JSONEncoder().encode(saved).write(to: manifest, options: .atomic)
            activeFile = saved.fileName
            return nil
        } catch {
            return "곡을 저장하지 못했습니다. 저장 공간을 확인해 주세요."
        }
    }

    func load() throws -> (SavedSong, URL)? {
        guard FileManager.default.fileExists(atPath: manifest.path) else {
            removeUnusedCopies()
            return nil
        }
        let values = try manifest.resourceValues(forKeys: [.fileSizeKey])
        guard let size = values.fileSize, size <= 8 * 1_024 * 1_024 else { throw CocoaError(.fileReadTooLarge) }
        let saved = try JSONDecoder().decode(SavedSong.self, from: Data(contentsOf: manifest))
        guard saved.version == 1, (saved.fileName as NSString).lastPathComponent == saved.fileName,
              saved.fileName.hasPrefix("song-") else { throw CocoaError(.fileReadCorruptFile) }
        activeFile = saved.fileName
        removeUnusedCopies()
        return (saved, directory.appendingPathComponent(saved.fileName))
    }

    func clear() -> Bool {
        do {
            if FileManager.default.fileExists(atPath: manifest.path) { try FileManager.default.removeItem(at: manifest) }
            activeFile = nil
            return true
        } catch { return false }
    }

    func discardIfUnused(_ url: URL) {
        if url.lastPathComponent != activeFile { try? FileManager.default.removeItem(at: url) }
    }

    func removeUnusedCopies() {
        let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
        for file in files where file.lastPathComponent.hasPrefix("song-") { discardIfUnused(file) }
    }
}
